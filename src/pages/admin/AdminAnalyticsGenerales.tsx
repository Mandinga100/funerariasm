/**
 * Analíticas Generales — vista unificada con pestañas profesionales:
 *  • Analítica por Comuna (tráfico, conversiones, CTR)
 *  • ROI por Comuna (ingresos atribuidos, casos cerrados)
 *
 * Reutiliza los módulos existentes para mantener una sola fuente de verdad
 * y permitir al equipo navegar entre ambas perspectivas sin cambiar de ruta.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Trophy, TrendingUp } from "lucide-react";
import AdminAnalyticsComunas from "./AdminAnalyticsComunas";
import AdminRevenueComunas from "./AdminRevenueComunas";

type TabKey = "trafico" | "roi";

export default function AdminAnalyticsGenerales() {
  const location = useLocation();
  const navigate = useNavigate();

  const initial: TabKey = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const t = sp.get("tab");
    return t === "roi" ? "roi" : "trafico";
  }, [location.search]);

  const [tab, setTab] = useState<TabKey>(initial);

  useEffect(() => {
    setTab(initial);
  }, [initial]);

  const handleChange = (v: string) => {
    setTab(v as TabKey);
    const sp = new URLSearchParams(location.search);
    sp.set("tab", v);
    navigate({ pathname: location.pathname, search: `?${sp.toString()}` }, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            Analíticas Generales
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centro unificado de inteligencia comercial: rendimiento de tráfico hiperlocal y retorno real por comuna.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={handleChange} className="space-y-4">
        <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-2 h-auto">
          <TabsTrigger value="trafico" className="flex items-center gap-2 data-[state=active]:text-primary">
            <BarChart3 className="w-4 h-4" />
            <span>Analítica por Comuna</span>
          </TabsTrigger>
          <TabsTrigger value="roi" className="flex items-center gap-2 data-[state=active]:text-gold">
            <Trophy className="w-4 h-4" />
            <span>ROI por Comuna</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trafico" className="mt-4 focus-visible:outline-none">
          <AdminAnalyticsComunas />
        </TabsContent>

        <TabsContent value="roi" className="mt-4 focus-visible:outline-none">
          <AdminRevenueComunas />
        </TabsContent>
      </Tabs>
    </div>
  );
}
