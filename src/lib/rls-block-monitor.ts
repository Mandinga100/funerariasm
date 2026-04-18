/**
 * RLS Block Monitor
 * Intercepta errores Postgres 42501 (RLS violation) y los registra en audit_logs
 * con módulo "rls_block" para que el CEO los pueda revisar en Configuración → Auditoría.
 */
import { supabase } from "@/integrations/supabase/client";

const RECENT_LOGS = new Map<string, number>(); // dedupe ventana 5s
const DEDUPE_MS = 5000;

interface RlsBlockMeta {
  table?: string;
  operation?: string; // select|insert|update|delete|rpc|unknown
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export async function logRlsBlock(meta: RlsBlockMeta) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // anon siempre falla, no nos interesa

    const key = `${user.id}|${meta.table ?? "?"}|${meta.operation ?? "?"}`;
    const now = Date.now();
    const last = RECENT_LOGS.get(key) ?? 0;
    if (now - last < DEDUPE_MS) return;
    RECENT_LOGS.set(key, now);

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      user_role: roleData?.role ?? "unknown",
      action: "rls_block",
      module: "rls_block",
      description: `Acceso bloqueado por RLS · ${meta.operation?.toUpperCase() ?? "?"} sobre ${meta.table ?? "tabla desconocida"}`,
      entity_type: meta.table ?? null,
      new_data: {
        table: meta.table ?? null,
        operation: meta.operation ?? null,
        pg_code: meta.code ?? null,
        pg_message: meta.message ?? null,
        pg_details: meta.details ?? null,
        pg_hint: meta.hint ?? null,
        pathname: typeof window !== "undefined" ? window.location.pathname : null,
      },
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // never throw from monitor
  }
}

/**
 * Patchea los métodos terminales de PostgrestQueryBuilder/Filter para
 * detectar errores con code === '42501' y registrarlos en audit_logs.
 * Idempotente: solo se aplica una vez.
 */
let installed = false;
export function installRlsMonitor() {
  if (installed) return;
  installed = true;

  const sb = supabase as any;
  const origFrom = sb.from.bind(sb);

  sb.from = (relation: string) => {
    const builder = origFrom(relation);
    // Cada operación (select/insert/update/delete/upsert) devuelve un Filter builder.
    // Envolvemos los métodos clave para capturar la promesa final.
    ["select", "insert", "update", "delete", "upsert"].forEach((op) => {
      const orig = builder[op]?.bind(builder);
      if (!orig) return;
      builder[op] = (...args: any[]) => {
        const filter = orig(...args);
        return wrapThenable(filter, relation, op);
      };
    });
    return builder;
  };
}

function wrapThenable(filter: any, table: string, operation: string) {
  if (!filter || typeof filter.then !== "function") return filter;
  const origThen = filter.then.bind(filter);
  filter.then = (onFulfilled: any, onRejected: any) =>
    origThen((res: any) => {
      if (res?.error?.code === "42501") {
        void logRlsBlock({
          table,
          operation,
          code: res.error.code,
          message: res.error.message,
          details: res.error.details,
          hint: res.error.hint,
        });
      }
      return onFulfilled ? onFulfilled(res) : res;
    }, onRejected);
  return filter;
}
