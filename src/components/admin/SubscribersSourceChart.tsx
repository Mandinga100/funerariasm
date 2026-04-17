import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

interface Props {
  sources: (string | null)[];
}

interface Slice {
  name: string;
  value: number;
  percent: number;
}

// Semantic palette using HSL design tokens
const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--secondary))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--destructive))",
  "hsl(var(--ring))",
];

const prettify = (s: string) =>
  s
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Slice }>;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{d.name}</p>
      <p className="text-sm font-semibold">
        {d.value} {d.value === 1 ? "suscriptor" : "suscriptores"}{" "}
        <span className="text-muted-foreground font-normal">({d.percent.toFixed(1)}%)</span>
      </p>
    </div>
  );
};

export function SubscribersSourceChart({ sources }: Props) {
  const data = useMemo<Slice[]>(() => {
    const counts = new Map<string, number>();
    sources.forEach((s) => {
      const key = s && s.trim() ? prettify(s) : "Sin origen";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const total = sources.length || 1;
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value, percent: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [sources]);

  const total = sources.length;
  const topSource = data[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Distribución por origen</CardTitle>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Total: <strong className="text-foreground">{total}</strong>
            </span>
            {topSource && (
              <span>
                Principal:{" "}
                <strong className="text-foreground">
                  {topSource.name} ({topSource.percent.toFixed(0)}%)
                </strong>
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
            Sin datos para mostrar.
          </div>
        ) : (
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingLeft: 16 }}
                  formatter={(value) => <span className="text-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center -ml-[15%]">
              <span className="text-2xl font-semibold leading-none">{total}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                Suscriptores
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
