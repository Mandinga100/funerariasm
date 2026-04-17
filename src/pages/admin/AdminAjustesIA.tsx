import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, AlertTriangle, DollarSign, Activity, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchAiActionSettings,
  invalidateAiActionSettingsCache,
  type AiActionSetting,
} from "@/lib/ai-actions";
import { startOfMonth } from "date-fns";

interface UsageRow {
  action_key: string;
  count: number;
  cost: number;
}

const AdminAjustesIA = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AiActionSetting[]>([]);
  const [usage, setUsage] = useState<Record<string, UsageRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    invalidateAiActionSettingsCache();
    const [data, usageData] = await Promise.all([
      fetchAiActionSettings(true),
      fetchMonthlyUsage(),
    ]);
    setSettings(data);
    setUsage(usageData);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const fetchMonthlyUsage = async (): Promise<Record<string, UsageRow>> => {
    const since = startOfMonth(new Date()).toISOString();
    const { data, error } = await (supabase.from as any)("ai_action_invocations")
      .select("action_key, estimated_cost_usd")
      .gte("created_at", since);
    if (error || !data) return {};
    const map: Record<string, UsageRow> = {};
    (data as { action_key: string; estimated_cost_usd: number }[]).forEach((row) => {
      const r = map[row.action_key] ?? { action_key: row.action_key, count: 0, cost: 0 };
      r.count += 1;
      r.cost += Number(row.estimated_cost_usd ?? 0);
      map[row.action_key] = r;
    });
    return map;
  };

  const updateField = async (
    id: string,
    patch: Partial<Pick<AiActionSetting, "enabled" | "estimated_cost_usd">>,
  ) => {
    setSavingKey(id);
    const { error } = await (supabase.from as any)("ai_action_settings")
      .update(patch)
      .eq("id", id);
    setSavingKey(null);
    if (error) {
      toast({ title: "No se pudo actualizar", description: error.message, variant: "destructive" });
      return;
    }
    invalidateAiActionSettingsCache();
    setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    toast({ title: "Ajuste guardado", description: "Los cambios se aplican de inmediato." });
  };

  const grouped = useMemo(() => {
    const m: Record<string, AiActionSetting[]> = {};
    settings.forEach((s) => {
      m[s.module] = m[s.module] ?? [];
      m[s.module].push(s);
    });
    return m;
  }, [settings]);

  const totals = useMemo(() => {
    const enabled = settings.filter((s) => s.enabled).length;
    const totalUsage = Object.values(usage).reduce((acc, u) => acc + u.count, 0);
    const totalCost = Object.values(usage).reduce((acc, u) => acc + u.cost, 0);
    return { enabled, total: settings.length, totalUsage, totalCost };
  }, [settings, usage]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-gold" /> Ajustes de Inteligencia Artificial
          </h1>
          <p className="text-sm text-muted-foreground">
            Habilita/deshabilita acciones IA del CRM, ajusta costos estimados y revisa el uso del mes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<Sparkles className="w-4 h-4 text-gold" />}
          label="Acciones activas"
          value={`${totals.enabled} / ${totals.total}`}
        />
        <KpiCard
          icon={<Activity className="w-4 h-4 text-gold" />}
          label="Usos este mes"
          value={totals.totalUsage.toLocaleString("es-CL")}
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4 text-gold" />}
          label="Costo estimado mes"
          value={`$${totals.totalCost.toFixed(2)} USD`}
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
          label="Desactivadas"
          value={`${totals.total - totals.enabled}`}
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Cargando ajustes…</div>
      ) : (
        Object.entries(grouped).map(([moduleName, items]) => (
          <section key={moduleName} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {moduleName}
            </h2>
            <div className="grid gap-3">
              {items.map((s) => {
                const u = usage[s.action_key];
                const monthCost = u?.cost ?? 0;
                const monthCount = u?.count ?? 0;
                return (
                  <Card key={s.id} className={!s.enabled ? "border-destructive/40" : "border-gold/20"}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            {s.display_name}
                            {!s.enabled && (
                              <Badge variant="destructive" className="text-[10px]">
                                Desactivada
                              </Badge>
                            )}
                            {s.model && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {s.model}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs leading-relaxed">
                            {s.description}
                          </CardDescription>
                          <code className="text-[10px] text-muted-foreground/70">{s.action_key}</code>
                        </div>
                        <Switch
                          checked={s.enabled}
                          disabled={savingKey === s.id}
                          onCheckedChange={(v) => updateField(s.id, { enabled: v })}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-0">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">
                          Costo estimado / uso (USD)
                        </Label>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          defaultValue={Number(s.estimated_cost_usd).toFixed(3)}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!Number.isNaN(v) && v !== Number(s.estimated_cost_usd)) {
                              void updateField(s.id, { estimated_cost_usd: v });
                            }
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Usos este mes</Label>
                        <div className="h-8 flex items-center px-3 rounded-md bg-muted/50 text-sm font-semibold">
                          {monthCount.toLocaleString("es-CL")}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">
                          Costo acumulado mes
                        </Label>
                        <div className="h-8 flex items-center px-3 rounded-md bg-muted/50 text-sm font-semibold text-gold">
                          ${monthCost.toFixed(3)} USD
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-xs text-muted-foreground space-y-1">
          <p className="flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
            Los costos son <strong>estimados</strong> basados en los precios públicos del modelo. El uso
            real puede variar según el tamaño de prompt y respuesta.
          </p>
          <p>
            Cuando desactivas una acción, el botón sigue visible en el CRM pero pide confirmación
            explícita antes de ejecutarse y muestra una marca roja.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const KpiCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </CardContent>
  </Card>
);

export default AdminAjustesIA;
