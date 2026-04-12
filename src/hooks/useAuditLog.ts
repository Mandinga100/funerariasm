import { supabase } from "@/integrations/supabase/client";

interface AuditEntry {
  action: string;
  module: string;
  description: string;
  entity_type?: string;
  entity_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
}

export async function logAudit(entry: AuditEntry) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    user_email: user.email ?? null,
    user_role: roleData?.role ?? "unknown",
    action: entry.action,
    module: entry.module,
    description: entry.description,
    entity_type: entry.entity_type ?? null,
    entity_id: entry.entity_id ?? null,
    old_data: entry.old_data ?? {},
    new_data: entry.new_data ?? {},
    user_agent: navigator.userAgent,
  });
}
