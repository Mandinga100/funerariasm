/**
 * Widget compacto para el Dashboard principal: top 10 comunas con más tráfico
 * en los últimos 30 días, con clicks de conversión y CTR.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

interface Row {
  slug: string;
  nombre: string;
  views: number;
  conversions: number;
  ctr: number;
}

export default function ComunaAnalyticsWidget() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = subDays(new Date(), 30).toISOString();

      const [pvRes, cvRes] = await Promise.all([
        (supabase.from as any)("comuna_page_views")
          .select("comuna_slug, comuna_nombre")
          .gte("created_at", since)
          .limit(10000),
        (supabase.from as any)("comuna_conversion_events")
          .select("comuna_slug")
          .gte("created_at", since)
          .limit(10000),
      ]);

      const viewsMap = new Map<string, { nombre: string; count: number }>();
      (pvRes.data ?? []).forEach((r: any) => {
        const cur = viewsMap.get(r.comuna_slug);
        if (cur) cur.count++;
        else viewsMap.set(r.comuna_slug, { nombre: r.comuna_nombre ?? r.comuna_slug, count: 1 });
      });

      const convMap = new Map<string, number>();
      (cvRes.data ?? []).forEach((r: any) => {
        convMap.set(r.comuna_slug, (convMap.get(r.comuna_slug) ?? 0) + 1);
      });

      const out: Row[] = Array.from(viewsMap.entries())
        .map(([slug, v]) => {
          const conversions = convMap.get(slug) ?? 0;
          return {
            slug,
            nombre: v.nombre,
            views: v.count,
            conversions,
            ctr: v.count > 0 ? (conversions / v.count) * 100 : 0,
          };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      setRows(out);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Top 10 Comunas (30 días)
        </CardTitle>
        <Link
          to="/admin/analytics-comunas"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Ver detalle <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-muted/40 animate-pulse rounded" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sin tráfico en las landing pages de comuna en los últimos 30 días.
          </p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <Link
                key={r.slug}
                to={`/funeraria/${r.slug}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40 transition-colors group"
              >
                <span className="text-xs font-mono text-muted-foreground w-5 text-right">{i + 1}</span>
                <span className="flex-1 text-sm font-medium truncate group-hover:text-primary">
                  {r.nombre}
                </span>
                <Badge variant="outline" className="text-[10px] gap-1">
                  <TrendingUp className="w-3 h-3" /> {r.views}
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                  {r.ctr.toFixed(1)}% CTR
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
