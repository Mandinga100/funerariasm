import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, MapPin, FileText, CreditCard, Flower, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STAGE_LABELS: Record<string, string> = {
  contactado: "Recibido y en contacto",
  cotizado: "Servicio cotizado",
  contratado: "Servicio contratado y en preparación",
  cerrado: "Servicio finalizado",
};

const OPS_LABELS: Record<string, string> = {
  sin_iniciar: "Por iniciar",
  preparando: "En preparación",
  retiro: "Retiro del cuerpo",
  velorio: "Velorio en curso",
  ceremonia: "Ceremonia",
  traslado: "Traslado",
  sepultacion: "Sepultación",
  cremacion: "Cremación",
  finalizado: "Servicio completado",
};

interface PublicTracking {
  family_code: string;
  family_name: string;
  tracking_status: string;
  updated_at: string;
  deceased_name: string | null;
  deceased_death_date: string | null;
  service_stage: string | null;
  operational_status: string | null;
  payment_summary: string | null;
  next_event: { title: string; event_type: string; start_at: string; end_at: string; location_name: string | null; comuna: string | null } | null;
  pending_documents: Array<{ document_type: string; document_name: string; status: string }>;
}

export default function Seguimiento() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [data, setData] = useState<PublicTracking | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (codeArg?: string) => {
    const c = (codeArg ?? code).trim();
    if (!c) return;
    setLoading(true); setError(""); setSearched(true);

    const { data: result, error: err } = await supabase
      .from("family_tracking_public" as never)
      .select("*")
      .eq("family_code", c.toLowerCase())
      .maybeSingle();

    if (err || !result) {
      setError("No se encontró un servicio con ese código, o aún no está habilitado para consulta. Por favor verifica con tu ejecutivo asignado.");
      setData(null);
    } else {
      setData(result as unknown as PublicTracking);
    }
    setLoading(false);
  };

  useEffect(() => {
    const c = searchParams.get("code");
    if (c) void search(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-8">
          <Flower className="w-10 h-10 mx-auto text-accent mb-3" aria-hidden />
          <h1 className="font-serif italic text-3xl md:text-4xl text-foreground">Seguimiento del servicio</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Ingrese el código privado entregado por su ejecutivo para consultar el avance.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consultar con código privado</CardTitle>
            <CardDescription>El código es de uso personal de la familia.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(e) => { e.preventDefault(); void search(); }}
            >
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ej: a1b2c3d4" autoComplete="off" />
              <Button type="submit" disabled={loading}>
                <Search className="w-4 h-4 mr-1" />{loading ? "Buscando…" : "Consultar"}
              </Button>
            </form>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {searched && data && (
          <div className="mt-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between gap-2 flex-wrap">
                  <span>{data.deceased_name ?? "Servicio funerario"}</span>
                  <Badge variant="secondary" className="font-normal">
                    Familia {data.family_name}
                  </Badge>
                </CardTitle>
                {data.deceased_death_date && (
                  <CardDescription>
                    Fecha de fallecimiento: {format(new Date(data.deceased_death_date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Etapa actual</p>
                  <p className="text-sm font-medium">
                    {OPS_LABELS[data.operational_status ?? ""] ?? STAGE_LABELS[data.service_stage ?? ""] ?? "En proceso"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span>Estado de pago:</span>
                  <Badge variant="outline">{data.payment_summary ?? "En revisión"}</Badge>
                </div>
              </CardContent>
            </Card>

            {data.next_event && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent" />Próximo paso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <p className="font-medium">{data.next_event.title}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(data.next_event.start_at), "EEEE d 'de' MMMM, HH:mm", { locale: es })} hrs
                  </p>
                  {(data.next_event.location_name || data.next_event.comuna) && (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {[data.next_event.location_name, data.next_event.comuna].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {data.pending_documents && data.pending_documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-accent" />Documentos pendientes
                  </CardTitle>
                  <CardDescription>Estos documentos ayudan a agilizar el servicio.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-sm">
                    {data.pending_documents.map((d, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 border-b last:border-0 py-1.5">
                        <span>{d.document_name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{d.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Última actualización: {format(new Date(data.updated_at), "dd MMM yyyy HH:mm", { locale: es })} · Para cualquier duda, su ejecutivo está disponible 24/7 al WhatsApp +56 9 6433 3760.
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
}
