import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, TrendingUp, RefreshCw, Landmark, Receipt, DollarSign, Flower2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

/**
 * Tarjeta profesional con fecha/hora en vivo + indicadores económicos chilenos
 * (UF, UTM, Dólar) y la Cuota Mortuoria expresada en 15 UF (estándar funerario CL).
 *
 * Fuentes oficiales (sin API key, gratuitas):
 *  - mindicador.cl  → UF, UTM, Dólar (publicados por el Banco Central de Chile)
 *  - Cuota Mortuoria: 15 UF (convertidas en tiempo real al peso chileno).
 */

type IndicatorValue = {
  value: number;
  unidad_medida: string;
  fecha: string;
};

type Indicators = {
  uf?: IndicatorValue;
  utm?: IndicatorValue;
  dolar?: IndicatorValue;
  fetchedAt: string;
  cached?: boolean;
};

const CACHE_KEY = "fsm_live_indicators_v2";
const REFRESH_MS = 15 * 60 * 1000; // 15 minutos
const CUOTA_MORTUORIA_UF = 15;

function formatCLP(n: number) {
  // Formato peso chileno: $1.234.567 (sin decimales, separador miles con punto)
  return `$${Math.round(n).toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
}

function formatUF(n: number) {
  return n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchIndicators(): Promise<Indicators> {
  const res = await fetch("https://mindicador.cl/api", { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();

  return {
    uf: json.uf ? { value: json.uf.valor, unidad_medida: "CLP", fecha: json.uf.fecha } : undefined,
    utm: json.utm ? { value: json.utm.valor, unidad_medida: "CLP", fecha: json.utm.fecha } : undefined,
    dolar: json.dolar ? { value: json.dolar.valor, unidad_medida: "CLP", fecha: json.dolar.fecha } : undefined,
    fetchedAt: new Date().toISOString(),
  };
}

export default function LiveIndicatorsCard() {
  const [now, setNow] = useState(new Date());
  const [data, setData] = useState<Indicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reloj en vivo (cada segundo) — sin re-fetch innecesario.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Cargar indicadores: primero caché para pintar instantáneo, luego refrescar.
  useEffect(() => {
    let cancelled = false;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Indicators;
        setData({ ...parsed, cached: true });
        setLoading(false);
      }
    } catch {}

    const load = async () => {
      try {
        const fresh = await fetchIndicators();
        if (cancelled) return;
        setData(fresh);
        setError(null);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); } catch {}
      } catch (e: any) {
        if (cancelled) return;
        setError("Sin conexión a indicadores");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const fresh = await fetchIndicators();
      setData(fresh);
      setError(null);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); } catch {}
    } catch {
      setError("Sin conexión a indicadores");
    } finally {
      setLoading(false);
    }
  };

  const dayName = format(now, "EEEE", { locale: es });
  const dateStr = format(now, "dd 'de' MMMM 'de' yyyy", { locale: es });
  const timeStr = format(now, "HH:mm:ss");

  const cuotaCLP = data?.uf ? data.uf.value * CUOTA_MORTUORIA_UF : null;

  const indicators = [
    {
      key: "uf",
      label: "UF",
      icon: Landmark,
      value: data?.uf ? formatCLP(data.uf.value) : "—",
      sub: data?.uf
        ? `${formatUF(data.uf.value)} CLP · al ${format(new Date(data.uf.fecha), "dd/MM/yyyy")}`
        : "Cargando…",
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      key: "utm",
      label: "UTM",
      icon: Receipt,
      value: data?.utm ? formatCLP(data.utm.value) : "—",
      sub: data?.utm ? format(new Date(data.utm.fecha), "MMMM yyyy", { locale: es }) : "Cargando…",
      tone: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      key: "dolar",
      label: "Dólar USD",
      icon: DollarSign,
      value: data?.dolar ? formatCLP(data.dolar.value) : "—",
      sub: data?.dolar ? `al ${format(new Date(data.dolar.fecha), "dd/MM/yyyy")}` : "Cargando…",
      tone: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      key: "cuota",
      label: "Cuota Mortuoria",
      icon: Flower2,
      value: cuotaCLP ? formatCLP(cuotaCLP) : "—",
      sub: `${CUOTA_MORTUORIA_UF} UF · estándar funerario CL`,
      tone: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
    },
  ];

  return (
    <Card className="overflow-hidden border-[#C5A059]/30 bg-gradient-to-br from-background via-background to-[#C5A059]/5">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-6">
          {/* Bloque fecha / hora */}
          <div className="flex-shrink-0 lg:border-r lg:border-border lg:pr-6 lg:min-w-[260px]">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Hoy</span>
            </div>
            <div className="mt-1.5">
              <p className="text-lg sm:text-xl font-bold capitalize leading-tight">{dayName}</p>
              <p className="text-xs sm:text-sm text-muted-foreground capitalize">{dateStr}</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C5A059]" />
              <span className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">{timeStr}</span>
              <span className="text-[10px] text-muted-foreground ml-1">Hora Chile</span>
            </div>
          </div>

          {/* Indicadores económicos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Indicadores en vivo</span>
                {data?.cached && !loading && (
                  <span className="text-[9px] text-muted-foreground/70 normal-case">(caché)</span>
                )}
                {error && (
                  <span className="text-[9px] text-destructive normal-case">· {error}</span>
                )}
              </div>
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label="Actualizar indicadores"
                title="Actualizar"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {indicators.map((it) => (
                <div
                  key={it.key}
                  className={cn(
                    "rounded-lg border border-border/60 p-2.5 sm:p-3 transition-shadow hover:shadow-sm",
                    it.bg
                  )}
                >
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {it.label}
                  </p>
                  <p className={cn("text-base sm:text-lg font-bold tabular-nums leading-tight mt-0.5", it.tone)}>
                    {it.value}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">
                    {it.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
