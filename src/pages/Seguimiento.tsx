import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, Clock, Flower } from "lucide-react";
import Layout from "@/components/Layout";

const STEPS = ["recibido", "en_preparación", "velatorio", "ceremonia", "traslado", "finalizado"];
const STEP_LABELS: Record<string, string> = {
  recibido: "Recibido",
  en_preparación: "En Preparación",
  velatorio: "Velatorio",
  ceremonia: "Ceremonia",
  traslado: "Traslado",
  finalizado: "Finalizado",
};

interface TrackingData {
  family_name: string;
  status: string;
  notes: string | null;
  updated_at: string;
}

export default function Seguimiento() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [data, setData] = useState<TrackingData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setSearched(true);

    const { data: result, error: err } = await supabase
      .from("family_tracking")
      .select("family_name, status, notes, updated_at")
      .eq("family_code", code.trim().toLowerCase())
      .maybeSingle();

    if (err || !result) {
      setError("No se encontró un servicio con ese código. Verifica e intenta nuevamente.");
      setData(null);
    } else {
      setData(result as TrackingData);
    }
    setLoading(false);
  };

  const currentIdx = data ? STEPS.indexOf(data.status) : -1;

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <Flower className="w-10 h-10 mx-auto mb-3 text-[#C5A059]" />
            <h1 className="text-2xl font-bold">Seguimiento de Servicio</h1>
            <p className="text-muted-foreground mt-1">Ingrese el código proporcionado por la funeraria</p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Código de seguimiento"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
            />
            <Button onClick={search} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
          </div>

          {error && searched && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {data && (
            <Card>
              <CardHeader>
                <CardTitle>Familia {data.family_name}</CardTitle>
                <CardDescription>
                  Última actualización: {new Date(data.updated_at).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Steps */}
                <div className="space-y-3">
                  {STEPS.map((step, idx) => {
                    const isCompleted = idx < currentIdx;
                    const isCurrent = idx === currentIdx;
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCompleted ? "bg-green-100 text-green-600" :
                          isCurrent ? "bg-[#C5A059]/20 text-[#C5A059] ring-2 ring-[#C5A059]" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <span className={`text-sm ${isCurrent ? "font-semibold" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                          {STEP_LABELS[step]}
                        </span>
                        {isCurrent && <Badge className="bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30">Actual</Badge>}
                      </div>
                    );
                  })}
                </div>

                {data.notes && (
                  <div className="bg-muted/50 rounded-md p-4">
                    <p className="text-sm font-medium mb-1">Notas:</p>
                    <p className="text-sm text-muted-foreground">{data.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
