import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { format, subDays, startOfDay, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  subscribedDates: string[];
  days?: number;
  onRangeChange?: (days: number) => void;
  rangeOptions?: number[];
}

interface Point {
  date: Date;
  label: string;
  fullLabel: string;
  count: number;
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground capitalize">{data.fullLabel}</p>
      <p className="text-sm font-semibold">
        {data.count} {data.count === 1 ? "suscriptor" : "suscriptores"}
      </p>
    </div>
  );
};

export function SubscribersTrendChart({ subscribedDates, days = 30, onRangeChange, rangeOptions }: Props) {
  const data = useMemo<Point[]>(() => {
    const today = startOfDay(new Date());
    const points: Point[] = [];
    const parsed = subscribedDates.map((d) => new Date(d));

    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(today, i);
      const count = parsed.filter((d) => isSameDay(d, day)).length;
      points.push({
        date: day,
        label: format(day, "d MMM", { locale: es }),
        fullLabel: format(day, "EEEE d 'de' MMMM yyyy", { locale: es }),
        count,
      });
    }
    return points;
  }, [subscribedDates, days]);

  const total = useMemo(() => data.reduce((s, p) => s + p.count, 0), [data]);
  const peak = useMemo(() => data.reduce((m, p) => (p.count > m ? p.count : m), 0), [data]);
  const avg = useMemo(() => (data.length ? (total / data.length).toFixed(1) : "0"), [total, data]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Tendencia de suscripciones</CardTitle>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Últimos <strong className="text-foreground">{days} días</strong>
            </span>
            <span>
              Total: <strong className="text-foreground">{total}</strong>
            </span>
            <span>
              Promedio/día: <strong className="text-foreground">{avg}</strong>
            </span>
            <span>
              Pico: <strong className="text-foreground">{peak}</strong>
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="subsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.2 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#subsGradient)"
                activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
