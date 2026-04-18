import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Gift, TrendingUp, ArrowRight, Crown } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TopMemorial {
  memorial_id: string;
  full_name: string | null;
  slug: string | null;
  total_amount: number;
  offerings_count: number;
}

interface OfferingsStats {
  monthRevenue: number;
  monthCount: number;
  uniqueDonors: number;
  topMemorials: TopMemorial[];
}

const formatCLP = (n: number) => `$${(n || 0).toLocaleString("es-CL")}`;

export default function MemorialOfferingsWidget() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OfferingsStats>({
    monthRevenue: 0,
    monthCount: 0,
    uniqueDonors: 0,
    topMemorials: [],
  });

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // Ofrendas del mes
      const { data: monthOfferings } = await supabase
        .from("memorial_offerings")
        .select("amount, donor_name, memorial_id")
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      const monthRevenue = (monthOfferings ?? []).reduce((s, o) => s + (o.amount || 0), 0);
      const monthCount = monthOfferings?.length ?? 0;
      const uniqueDonors = new Set((monthOfferings ?? []).map(o => o.donor_name?.toLowerCase().trim() || "anonimo")).size;

      // Top 5 memoriales con más ofrendas (todo histórico)
      const { data: allOfferings } = await supabase
        .from("memorial_offerings")
        .select("memorial_id, amount");

      const byMemorial = new Map<string, { amount: number; count: number }>();
      (allOfferings ?? []).forEach(o => {
        const cur = byMemorial.get(o.memorial_id) ?? { amount: 0, count: 0 };
        cur.amount += o.amount || 0;
        cur.count += 1;
        byMemorial.set(o.memorial_id, cur);
      });

      const topIds = [...byMemorial.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 5)
        .map(([id]) => id);

      let topMemorials: TopMemorial[] = [];
      if (topIds.length > 0) {
        const { data: memorialsData } = await supabase
          .from("memorials")
          .select("id, full_name, slug")
          .in("id", topIds);

        topMemorials = topIds.map(id => {
          const m = memorialsData?.find(x => x.id === id);
          const agg = byMemorial.get(id)!;
          return {
            memorial_id: id,
            full_name: m?.full_name ?? "Memorial eliminado",
            slug: m?.slug ?? null,
            total_amount: agg.amount,
            offerings_count: agg.count,
          };
        });
      }

      setStats({ monthRevenue, monthCount, uniqueDonors, topMemorials });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <div className="h-64 rounded-lg border bg-muted/30 animate-pulse" />;
  }

  const monthLabel = format(new Date(), "MMMM yyyy", { locale: es });

  return (
    <Card className="border-[#C5A059]/30 bg-gradient-to-br from-[#C5A059]/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#C5A059]" />
            Ofrendas Memoriales — {monthLabel}
          </CardTitle>
          <Badge variant="outline" className="text-[10px] border-[#C5A059]/40 text-[#C5A059]">
            CEO Only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs del mes */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-background border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
              <TrendingUp className="w-3 h-3" /> Total mes
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1 text-[#C5A059]">{formatCLP(stats.monthRevenue)}</p>
          </div>
          <div className="p-3 rounded-lg bg-background border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
              <Gift className="w-3 h-3" /> Donaciones
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">{stats.monthCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-background border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
              <Heart className="w-3 h-3" /> Donantes
            </div>
            <p className="text-lg sm:text-xl font-bold mt-1">{stats.uniqueDonors}</p>
          </div>
        </div>

        {/* Top 5 memoriales */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Top 5 memoriales con más ofrendas
            </h4>
            <button
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
              onClick={() => navigate("/admin/memoriales")}
            >
              Gestionar <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {stats.topMemorials.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aún no hay ofrendas registradas.
            </p>
          ) : (
            <div className="space-y-1.5">
              {stats.topMemorials.map((m, idx) => (
                <div
                  key={m.memorial_id}
                  onClick={() => m.slug && navigate(`/legados-eternos/${m.slug}`)}
                  className={cn(
                    "flex items-center justify-between gap-3 p-2.5 rounded-md border bg-background transition-all",
                    m.slug && "cursor-pointer hover:shadow-sm hover:border-[#C5A059]/40"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                      idx === 0 ? "bg-[#C5A059] text-white" :
                      idx === 1 ? "bg-[#C5A059]/70 text-white" :
                      idx === 2 ? "bg-[#C5A059]/50 text-white" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {m.offerings_count} ofrenda{m.offerings_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#C5A059] whitespace-nowrap">
                    {formatCLP(m.total_amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
