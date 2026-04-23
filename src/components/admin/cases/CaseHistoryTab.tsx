import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, Briefcase, ClipboardList, FileCheck2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface LogRow {
  id: string;
  status_area: "commercial" | "operational" | "documental" | "financial";
  old_value: string | null;
  new_value: string;
  reason: string | null;
  performed_by: string | null;
  created_at: string;
}

const AREA_META: Record<LogRow["status_area"], { label: string; icon: typeof Briefcase }> = {
  commercial: { label: "Comercial", icon: Briefcase },
  operational: { label: "Operativo", icon: ClipboardList },
  documental: { label: "Documental", icon: FileCheck2 },
  financial: { label: "Financiero", icon: Wallet },
};

interface Props { caseId: string; }

/** Bitácora cronológica de cambios de estado (registrada por trigger). */
export default function CaseHistoryTab({ caseId }: Props) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("case_status_log")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as LogRow[]) ?? []);
    setLoading(false);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (rows.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Sin cambios de estado registrados todavía.</p>;

  return (
    <ol className="space-y-2">
      {rows.map(r => {
        const meta = AREA_META[r.status_area];
        const Icon = meta.icon;
        return (
          <li key={r.id} className="rounded-md border p-2.5 flex items-start gap-2.5">
            <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs">
                <span className="font-medium">{meta.label}:</span>{" "}
                <span className="text-muted-foreground">{r.old_value ?? "—"}</span>
                <span className="mx-1">→</span>
                <span className="font-medium">{r.new_value}</span>
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: es })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
