import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

/**
 * /__diag — Página de diagnóstico técnico.
 *
 * Visibilidad:
 *  - Preview de Lovable (id-preview--*.lovable.app, *.sandbox.lovable.dev, localhost): siempre visible.
 *  - Producción (funerariasm.lovable.app y custom domains): bloqueada salvo ?force=1.
 *
 * Muestra:
 *  - Build info (modo, timestamp del bundle, ruta).
 *  - Conexión a Lovable Cloud (ping a Supabase).
 *  - Errores de runtime capturados en esta sesión (window.onerror + unhandledrejection).
 *  - User agent + viewport.
 */

type RuntimeError = {
  ts: string;
  type: "error" | "unhandledrejection";
  message: string;
  source?: string;
  line?: number;
  col?: number;
};

type CloudPing = { ok: boolean; latencyMs?: number; detail?: string } | null;

const isPreviewHost = () => {
  const h = typeof window !== "undefined" ? window.location.hostname : "";
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".sandbox.lovable.dev") ||
    h.includes("id-preview--") ||
    h.endsWith("lovable.dev")
  );
};

export default function Diag() {
  const forced = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("force") === "1";
  const allowed = isPreviewHost() || forced;

  const [errors, setErrors] = useState<RuntimeError[]>([]);
  const [ping, setPing] = useState<CloudPing>(null);
  const [pingLoading, setPingLoading] = useState(false);

  // Capturar errores globales mientras el usuario está en /__diag.
  useEffect(() => {
    if (!allowed) return;
    const onErr = (ev: ErrorEvent) => {
      setErrors((prev) => [
        ...prev,
        {
          ts: new Date().toISOString(),
          type: "error",
          message: ev.message || String(ev.error ?? "unknown"),
          source: ev.filename,
          line: ev.lineno,
          col: ev.colno,
        },
      ]);
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason;
      const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : typeof reason === "string" ? reason : JSON.stringify(reason);
      setErrors((prev) => [
        ...prev,
        { ts: new Date().toISOString(), type: "unhandledrejection", message },
      ]);
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, [allowed]);

  const runPing = async () => {
    setPingLoading(true);
    const t0 = performance.now();
    try {
      const { error } = await supabase.from("blog_posts").select("id", { count: "exact", head: true }).limit(1);
      const latency = Math.round(performance.now() - t0);
      if (error && error.code !== "PGRST116") {
        setPing({ ok: false, latencyMs: latency, detail: `${error.code ?? ""} ${error.message}`.trim() });
      } else {
        setPing({ ok: true, latencyMs: latency });
      }
    } catch (e) {
      setPing({ ok: false, detail: e instanceof Error ? e.message : String(e) });
    } finally {
      setPingLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) void runPing();
  }, [allowed]);

  if (!allowed) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-xl font-semibold">Diagnóstico no disponible</h1>
            <p className="text-sm text-muted-foreground">
              Esta página solo está accesible en el entorno de preview. Si necesitas verla en producción agrega
              <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-foreground">?force=1</code>
              a la URL.
            </p>
          </div>
        </div>
      </>
    );
  }

  const buildMode = import.meta.env.MODE;
  const isProd = import.meta.env.PROD;
  const buildTs = new Date(typeof __BUILD_TIMESTAMP__ !== "undefined" ? __BUILD_TIMESTAMP__ : Date.now()).toISOString();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "n/a";
  const viewport = typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "n/a";

  return (
    <>
      <Helmet>
        <title>Diagnóstico — Funeraria Santa Margarita</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <header className="border-b border-border pb-4">
            <h1 className="text-2xl font-semibold">Modo Diagnóstico</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Estado del build, conectividad de backend y errores de runtime capturados en esta sesión.
            </p>
          </header>

          <Section title="Build">
            <Row k="Modo" v={buildMode} />
            <Row k="Producción" v={String(isProd)} />
            <Row k="Build timestamp" v={buildTs} mono />
            <Row k="Ruta actual" v={window.location.pathname} mono />
            <Row k="Host" v={window.location.hostname} mono />
          </Section>

          <Section
            title="Lovable Cloud (backend)"
            action={
              <button
                onClick={runPing}
                disabled={pingLoading}
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition disabled:opacity-50"
              >
                {pingLoading ? "Verificando…" : "Re-verificar"}
              </button>
            }
          >
            {ping === null ? (
              <p className="text-sm text-muted-foreground">Esperando…</p>
            ) : ping.ok ? (
              <>
                <Row k="Estado" v="✅ Conectado" />
                <Row k="Latencia" v={`${ping.latencyMs} ms`} />
              </>
            ) : (
              <>
                <Row k="Estado" v="❌ Sin conexión" />
                {ping.latencyMs !== undefined && <Row k="Latencia" v={`${ping.latencyMs} ms`} />}
                {ping.detail && <Row k="Detalle" v={ping.detail} mono />}
              </>
            )}
          </Section>

          <Section title="Entorno cliente">
            <Row k="Viewport" v={viewport} mono />
            <Row k="DPR" v={String(window.devicePixelRatio)} />
            <Row k="User agent" v={ua} mono small />
          </Section>

          <Section
            title={`Errores de runtime (${errors.length})`}
            action={
              errors.length > 0 ? (
                <button
                  onClick={() => setErrors([])}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted transition"
                >
                  Limpiar
                </button>
              ) : undefined
            }
          >
            {errors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin errores capturados. Navega por el sitio en otra pestaña y vuelve aquí — los errores globales se acumulan.
              </p>
            ) : (
              <ul className="space-y-2">
                {errors.map((e, i) => (
                  <li key={i} className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-destructive">{e.type}</span>
                      <span className="text-muted-foreground font-mono">{e.ts}</span>
                    </div>
                    <p className="font-mono break-words">{e.message}</p>
                    {e.source && (
                      <p className="text-muted-foreground font-mono mt-1 break-all">
                        {e.source}
                        {e.line !== undefined ? `:${e.line}:${e.col ?? 0}` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <footer className="text-xs text-muted-foreground pt-4 border-t border-border">
            Página oculta de los buscadores (noindex). Solo visible en preview, o en producción con
            <code className="mx-1 px-1 rounded bg-muted text-foreground">?force=1</code>.
          </footer>
        </div>
      </div>
    </>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {action}
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function Row({ k, v, mono, small }: { k: string; v: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-32 shrink-0 text-muted-foreground">{k}</span>
      <span className={`flex-1 break-words ${mono ? "font-mono" : ""} ${small ? "text-xs" : ""}`}>{v}</span>
    </div>
  );
}
