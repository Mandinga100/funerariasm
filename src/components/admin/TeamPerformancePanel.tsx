import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { signAvatarUrls } from "@/lib/avatar-url";
import { Trophy, TrendingUp, TrendingDown, Users, Download, RefreshCw, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AppRole = "ceo" | "admin" | "moderator";

interface Member {
  user_id: string;
  role: AppRole;
  display_name?: string;
  email?: string;
  avatar_url?: string | null;
}

interface LeadRow {
  id: string;
  assigned_to: string | null;
  pipeline_stage: string | null;
  status: string | null;
  last_contacted_at: string | null;
  auto_archived_at: string | null;
  created_at: string;
}

interface MetricsRow {
  member: Member;
  total: number;       // leads asignados en rango
  attended: number;    // pasaron de "nuevo"
  contacted: number;   // last_contacted_at not null
  closed: number;      // pipeline_stage = cerrado
  lost: number;        // perdido / archivados
  conversionRate: number;
  lossRate: number;
}

const RANGES = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "365", label: "Último año" },
  { value: "all", label: "Todo el tiempo" },
];

const ROLE_BADGE: Record<AppRole, string> = {
  ceo: "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300/60",
  admin: "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300/60",
  moderator: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300/60",
};

export default function TeamPerformancePanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [range, setRange] = useState<string>("30");
  const [roleFilter, setRoleFilter] = useState<"all" | AppRole>("all");

  const load = async () => {
    setLoading(true);
    try {
      // 1) Equipo
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      let profilesById: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", ids);
        for (const p of profs ?? []) profilesById[p.user_id] = p;
      }
      // Excluimos al CEO de la evaluación de rendimiento (no se mide a la dirección).
      const memberList: Member[] = (roles ?? [])
        .filter((r: any) => r.role !== "ceo")
        .map((r: any) => ({
          user_id: r.user_id,
          role: r.role,
          display_name: profilesById[r.user_id]?.display_name,
          email: undefined,
          avatar_url: profilesById[r.user_id]?.avatar_url ?? null,
        }));

      // Firmar avatares
      const avatarUrls = memberList.map((m) => m.avatar_url).filter(Boolean) as string[];
      const signed = avatarUrls.length ? await signAvatarUrls(avatarUrls) : {};
      const signedMembers = memberList.map((m) => ({
        ...m,
        avatar_url: m.avatar_url ? signed[m.avatar_url] ?? m.avatar_url : null,
      }));
      setMembers(signedMembers);

      // 2) Leads
      const { data: ld } = await supabase
        .from("contact_leads")
        .select("id, assigned_to, pipeline_stage, status, last_contacted_at, auto_archived_at, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      setLeads((ld ?? []) as LeadRow[]);
    } catch (err: any) {
      toast({ title: "Error al cargar métricas", description: err?.message ?? "Intenta de nuevo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sinceISO = useMemo(() => {
    if (range === "all") return null;
    const days = parseInt(range, 10);
    return new Date(Date.now() - days * 86400_000).toISOString();
  }, [range]);

  const metrics: MetricsRow[] = useMemo(() => {
    const list = members.filter((m) => roleFilter === "all" ? true : m.role === roleFilter);
    return list
      .map((member) => {
        const mine = leads.filter((l) => {
          if (l.assigned_to !== member.user_id) return false;
          if (sinceISO && l.created_at < sinceISO) return false;
          return true;
        });
        const total = mine.length;
        const closed = mine.filter((l) => (l.pipeline_stage ?? "") === "cerrado" || l.status === "closed").length;
        const lost = mine.filter((l) => (l.pipeline_stage ?? "") === "perdido" || !!l.auto_archived_at).length;
        const contacted = mine.filter((l) => !!l.last_contacted_at).length;
        const attended = mine.filter((l) => (l.pipeline_stage ?? "nuevo") !== "nuevo").length;
        const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
        const lossRate = total > 0 ? Math.round((lost / total) * 100) : 0;
        return { member, total, attended, contacted, closed, lost, conversionRate, lossRate };
      })
      .sort((a, b) => b.closed - a.closed || b.conversionRate - a.conversionRate);
  }, [members, leads, sinceISO, roleFilter]);

  const totals = useMemo(() => {
    return metrics.reduce(
      (acc, m) => ({
        total: acc.total + m.total,
        attended: acc.attended + m.attended,
        contacted: acc.contacted + m.contacted,
        closed: acc.closed + m.closed,
        lost: acc.lost + m.lost,
      }),
      { total: 0, attended: 0, contacted: 0, closed: 0, lost: 0 }
    );
  }, [metrics]);

  const exportCSV = () => {
    const headers = ["Nombre", "Rol", "Email", "Asignados", "Atendidos", "Contactados", "Cerrados", "Perdidos", "Conversión %", "Pérdida %"];
    const rows = metrics.map((m) => [
      m.member.display_name ?? "—",
      m.member.role,
      m.member.email ?? "—",
      m.total, m.attended, m.contacted, m.closed, m.lost,
      m.conversionRate, m.lossRate,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rendimiento-equipo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const initials = (name?: string, email?: string) => {
    const base = (name || email || "??").trim();
    return base.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-[#C5A059]" /> Rendimiento por trabajador</CardTitle>
            <CardDescription>Atendidos · Contactados · Cerrados · Tasa de éxito y pérdida</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="moderator">Moderadores</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-9">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!metrics.length} className="h-9">
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiTile icon={<Users className="w-4 h-4" />} label="Asignados" value={totals.total} />
            <KpiTile icon={<Activity className="w-4 h-4" />} label="Atendidos" value={totals.attended} />
            <KpiTile icon={<TrendingUp className="w-4 h-4 text-emerald-600" />} label="Contactados" value={totals.contacted} />
            <KpiTile icon={<Trophy className="w-4 h-4 text-[#C5A059]" />} label="Cerrados" value={totals.closed} />
            <KpiTile icon={<TrendingDown className="w-4 h-4 text-rose-600" />} label="Perdidos" value={totals.lost} />
          </div>

          {/* Tabla */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Trabajador</th>
                    <th className="px-3 py-2 font-medium">Rol</th>
                    <th className="px-3 py-2 font-medium text-right">Asign.</th>
                    <th className="px-3 py-2 font-medium text-right">Atend.</th>
                    <th className="px-3 py-2 font-medium text-right">Contact.</th>
                    <th className="px-3 py-2 font-medium text-right">Cerrados</th>
                    <th className="px-3 py-2 font-medium text-right">Perdidos</th>
                    <th className="px-3 py-2 font-medium min-w-[160px]">Tasa de éxito</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={9} className="p-3"><Skeleton className="h-8 w-full" /></td>
                    </tr>
                  ))}
                  {!loading && metrics.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Sin trabajadores en este filtro.</td></tr>
                  )}
                  {!loading && metrics.map((m, idx) => (
                    <tr key={m.member.user_id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7">
                            {m.member.avatar_url ? <AvatarImage src={m.member.avatar_url} /> : null}
                            <AvatarFallback className="text-[10px]">{initials(m.member.display_name, m.member.email)}</AvatarFallback>
                          </Avatar>
                          <div className="leading-tight">
                            <div className="font-medium">{m.member.display_name ?? "Sin nombre"}</div>
                            <div className="text-xs text-muted-foreground">{m.member.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={ROLE_BADGE[m.member.role]}>{m.member.role}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.total}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.attended}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.contacted}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">{m.closed}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-rose-700 dark:text-rose-400">{m.lost}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Progress value={m.conversionRate} className="h-2 flex-1" />
                          <span className="text-xs tabular-nums w-10 text-right">{m.conversionRate}%</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Pérdida: {m.lossRate}%</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Las métricas se calculan a partir de los leads asignados a cada trabajador en el rango seleccionado.
            <strong> Atendidos</strong>: leads movidos fuera de "Nuevo". <strong>Contactados</strong>: con fecha de último contacto.
            <strong> Cerrados</strong>: en etapa "Cerrado". <strong>Perdidos</strong>: en etapa "Perdido" o auto-archivados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
