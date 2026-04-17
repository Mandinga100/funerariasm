import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, DollarSign, Briefcase, Percent } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from "recharts";

interface MonthlyData {
  month: string;
  leads: number;
  converted: number;
  revenue: number;
  casesRevenue: number;
}

interface PipelineData {
  stage: string;
  stageId: string;
  count: number;
}

interface CasesByPayment {
  status: string;
  count: number;
  color: string;
}

interface UrgencyData {
  name: string;
  value: number;
  color: string;
}

interface Props {
  monthlyData: MonthlyData[];
  casesStageData: PipelineData[];
  casesPaymentData: CasesByPayment[];
  conversionTrend: { month: string; rate: number }[];
  pipelineData: PipelineData[];
  leadsTimeline: { date: string; count: number }[];
  urgencyData: UrgencyData[];
}

/**
 * All recharts-based dashboard charts. Lazy-loaded from Dashboard so that
 * the recharts bundle (~165 kB gzip) is only fetched once stats are ready,
 * keeping the admin shell + KPI cards on the critical path.
 */
export default function DashboardCharts({
  monthlyData,
  casesStageData,
  casesPaymentData,
  conversionTrend,
  pipelineData,
  leadsTimeline,
  urgencyData,
}: Props) {
  const navigate = useNavigate();

  return (
    <>
      {/* Leads por Mes + Ingresos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              Leads por Mes (últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value,
                    name === "leads" ? "Total Leads" : "Convertidos",
                  ]}
                />
                <Legend
                  formatter={(value) => (value === "leads" ? "Total" : "Convertidos")}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Ingresos Mensuales (CLP)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyData} margin={{ left: 10, right: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="casesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `$${value.toLocaleString("es-CL")}`,
                    name === "revenue" ? "Pagos Verificados" : "Casos Pagados",
                  ]}
                />
                <Legend
                  formatter={(value) => (value === "revenue" ? "Pagos Verificados" : "Casos Pagados")}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#revenueGradient)" />
                <Area type="monotone" dataKey="casesRevenue" stroke="#3b82f6" strokeWidth={2} fill="url(#casesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Casos por Etapa + Estado de Pago */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              Casos por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={casesStageData}
                margin={{ left: 0, right: 0 }}
                onClick={(data: any) => {
                  if (data?.activePayload?.[0]?.payload?.stageId) {
                    navigate(`/admin/casos?stage=${data.activePayload[0].payload.stageId}`);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Casos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Estado de Pago de Casos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={casesPaymentData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  label={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                >
                  {casesPaymentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tasa de Conversión + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              Tasa de Conversión Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={conversionTrend} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
                <Tooltip formatter={(value: number) => [`${value}%`, "Conversión"]} />
                <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: "#8b5cf6" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pipeline de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={pipelineData}
                layout="vertical"
                margin={{ left: 20 }}
                onClick={(data: any) => {
                  if (data?.activePayload?.[0]?.payload?.stageId) {
                    navigate(`/admin/leads?stage=${data.activePayload[0].payload.stageId}`);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={80} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline + Urgency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Leads Últimos 14 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={leadsTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribución por Urgencia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={urgencyData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  label={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                  onClick={(data) => {
                    if (data?.name) {
                      navigate(`/admin/leads?urgency=${data.name}`);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {urgencyData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
