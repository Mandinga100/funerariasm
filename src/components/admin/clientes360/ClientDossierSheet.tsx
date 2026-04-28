import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  IdCard, User, Heart, Users, CreditCard, FileText,
  Hash, Phone, Mail, MapPin, Calendar, Loader2, ExternalLink,
  Sparkles, History, TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  personId: string | null;
  onClose: () => void;
}

type AnyRow = Record<string, any>;

const fmtCLP = (n?: number | null) =>
  typeof n === "number" ? `$${n.toLocaleString("es-CL")}` : "—";

const fmtDate = (d?: string | null, withTime = false) =>
  d ? format(new Date(d), withTime ? "dd MMM yyyy HH:mm" : "dd MMM yyyy", { locale: es }) : "—";

const stageTone: Record<string, string> = {
  nuevo: "bg-slate-100 text-slate-700",
  contactado: "bg-blue-50 text-blue-700",
  cotizado: "bg-amber-50 text-amber-700",
  contratado: "bg-emerald-50 text-emerald-700",
  cerrado: "bg-purple-50 text-purple-700",
};

export default function ClientDossierSheet({ personId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [person, setPerson] = useState<AnyRow | null>(null);
  const [profile, setProfile] = useState<AnyRow | null>(null);
  const [cases, setCases] = useState<AnyRow[]>([]);
  const [leads, setLeads] = useState<AnyRow[]>([]);
  const [familyMembers, setFamilyMembers] = useState<AnyRow[]>([]);
  const [payments, setPayments] = useState<AnyRow[]>([]);
  const [documents, setDocuments] = useState<AnyRow[]>([]);
  const [tab, setTab] = useState("resumen");

  useEffect(() => {
    if (!personId) return;
    setTab("resumen");
    loadAll(personId);
  }, [personId]);

  const loadAll = async (pid: string) => {
    setLoading(true);

    // Persona + perfil cliente
    const [{ data: pData }, { data: cpData }] = await Promise.all([
      supabase.from("persons" as any).select("*").eq("id", pid).maybeSingle(),
      supabase.from("client_profiles" as any).select("*").eq("person_id", pid).maybeSingle(),
    ]);
    setPerson(pData as any);
    const profileData = cpData as AnyRow | null;
    setProfile(profileData);

    // Casos del titular (incluye datos del fallecido)
    const { data: cData } = await supabase
      .from("service_cases")
      .select("id, case_number, pipeline_stage, commercial_status, financial_status, total_amount, amount_paid, deceased_name, deceased_rut, deceased_birth_date, deceased_death_date, deceased_relationship, ceremony_location, ceremony_date, comuna, selected_plan, source, created_at")
      .eq("person_id", pid)
      .order("created_at", { ascending: false });
    const caseList = (cData as any) ?? [];
    setCases(caseList);

    // Leads históricos
    const { data: lData } = await supabase
      .from("contact_leads")
      .select("id, name, urgency, pipeline_stage, selected_plan, source, message, created_at")
      .eq("person_id", pid)
      .order("created_at", { ascending: false });
    setLeads((lData as any) ?? []);

    // Familia
    let memberRows: AnyRow[] = [];
    if (profileData?.family_group_id) {
      const { data: fmData } = await supabase
        .from("family_group_members" as any)
        .select("id, role, relationship, is_primary_contact, person_id, notes")
        .eq("family_group_id", profileData.family_group_id);
      const memberIds = (fmData as any[] ?? []).map((r) => r.person_id).filter(Boolean);
      if (memberIds.length) {
        const { data: peopleData } = await supabase
          .from("persons" as any)
          .select("id, full_name, rut, phone, email")
          .in("id", memberIds);
        const map = new Map<string, any>((peopleData as any[] ?? []).map((p) => [p.id, p]));
        memberRows = (fmData as any[] ?? []).map((m) => ({ ...m, person: map.get(m.person_id) }));
      }
    }
    setFamilyMembers(memberRows);

    // Pagos: consolidados por case_number → payment_transactions
    const caseNumbers = caseList.map((c: AnyRow) => c.case_number).filter(Boolean);
    if (caseNumbers.length) {
      const { data: payData } = await supabase
        .from("payment_transactions" as any)
        .select("id, amount, currency, status, payment_method, case_reference, paid_at, created_at, notes")
        .in("case_reference", caseNumbers)
        .order("created_at", { ascending: false });
      setPayments((payData as any) ?? []);

      // Documentos de los casos
      const caseIds = caseList.map((c: AnyRow) => c.id);
      const { data: docData } = await supabase
        .from("case_documents" as any)
        .select("id, case_id, document_type, document_name, status, mime_type, expires_at, created_at")
        .in("case_id", caseIds)
        .order("created_at", { ascending: false });
      setDocuments((docData as any) ?? []);
    } else {
      setPayments([]);
      setDocuments([]);
    }

    setLoading(false);
  };

  // Derivados para tarjetas resumen
  const totalCases = cases.length;
  const activeCases = cases.filter((c) => !["cerrado"].includes(c.pipeline_stage)).length;
  const totalContracted = cases.reduce((s, c) => s + (c.total_amount ?? 0), 0);
  const totalPaid = cases.reduce((s, c) => s + (c.amount_paid ?? 0), 0);
  const lastCase = cases[0];
  const deceasedFromCases = cases.filter((c) => c.deceased_name);

  return (
    <Sheet open={!!personId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-xl">
              <IdCard className="w-5 h-5 text-primary" />
              {person?.full_name ?? (loading ? "Cargando…" : "Cliente 360")}
              {person?.verified && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Verificado</Badge>}
            </SheetTitle>
          </SheetHeader>
          {person && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
              {person.rut && <span><Hash className="inline w-3 h-3 mr-1" />{person.rut}</span>}
              {person.phone && <span><Phone className="inline w-3 h-3 mr-1" />{person.phone}</span>}
              {person.email && <span><Mail className="inline w-3 h-3 mr-1" />{person.email}</span>}
              {person.comuna && <span><MapPin className="inline w-3 h-3 mr-1" />{person.comuna}</span>}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando expediente…
          </div>
        ) : !person ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Persona no encontrada.</div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="px-4 sm:px-6 pb-8 pt-4">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto">
              <TabsTrigger value="resumen" className="flex-col gap-0.5 py-2 text-[11px]"><Sparkles className="w-3.5 h-3.5" />Resumen</TabsTrigger>
              <TabsTrigger value="titular" className="flex-col gap-0.5 py-2 text-[11px]"><User className="w-3.5 h-3.5" />Titular</TabsTrigger>
              <TabsTrigger value="fallecido" className="flex-col gap-0.5 py-2 text-[11px]"><Heart className="w-3.5 h-3.5" />Fallecido</TabsTrigger>
              <TabsTrigger value="familia" className="flex-col gap-0.5 py-2 text-[11px]"><Users className="w-3.5 h-3.5" />Familia</TabsTrigger>
              <TabsTrigger value="pagos" className="flex-col gap-0.5 py-2 text-[11px]"><CreditCard className="w-3.5 h-3.5" />Pagos</TabsTrigger>
              <TabsTrigger value="documentos" className="flex-col gap-0.5 py-2 text-[11px]"><FileText className="w-3.5 h-3.5" />Docs</TabsTrigger>
            </TabsList>

            {/* RESUMEN */}
            <TabsContent value="resumen" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <KpiBlock label="Casos totales" value={totalCases.toString()} icon={History} />
                <KpiBlock label="Activos" value={activeCases.toString()} icon={TrendingUp} tone="emerald" />
                <KpiBlock label="Contratado" value={fmtCLP(totalContracted)} icon={CreditCard} />
                <KpiBlock label="Pagado" value={fmtCLP(totalPaid)} icon={CreditCard} tone={totalPaid >= totalContracted && totalContracted > 0 ? "emerald" : "amber"} />
              </div>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5"><History className="w-4 h-4" /> Último caso</h4>
                  {lastCase ? (
                    <Link to={`/admin/casos?case=${lastCase.id}`} className="block p-3 rounded-md border hover:bg-muted/40 transition">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{lastCase.case_number}</div>
                        <Badge className={stageTone[lastCase.pipeline_stage] ?? ""}>{lastCase.pipeline_stage}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                        {lastCase.deceased_name && <span>Fallecido/a: <span className="text-foreground">{lastCase.deceased_name}</span></span>}
                        {lastCase.selected_plan && <span>Plan: {lastCase.selected_plan}</span>}
                        <span>{fmtDate(lastCase.created_at, true)}</span>
                      </div>
                    </Link>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin casos registrados.</p>
                  )}
                </CardContent>
              </Card>

              {profile?.internal_notes && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-1">Notas internas del cliente</h4>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{profile.internal_notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TITULAR */}
            <TabsContent value="titular" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <Field label="Nombre completo" value={person.full_name} />
                  <Field label="RUT" value={person.rut} />
                  <Field label="Teléfono" value={person.phone} icon={Phone} />
                  <Field label="Email" value={person.email} icon={Mail} />
                  <Field label="Comuna" value={person.comuna} icon={MapPin} />
                  <Field label="Fecha de nacimiento" value={fmtDate(person.birth_date)} icon={Calendar} />
                  <Field label="Origen del registro" value={person.source} />
                  <Field label="Registrado el" value={fmtDate(person.created_at, true)} />
                  {person.notes && <Field label="Notas" value={person.notes} multiline />}
                </CardContent>
              </Card>

              {leads.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-2">Leads históricos del titular ({leads.length})</h4>
                    <div className="space-y-2">
                      {leads.slice(0, 5).map((l) => (
                        <div key={l.id} className="p-2.5 border rounded-md text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{l.name ?? "Sin nombre"}</span>
                            <Badge variant="outline" className="text-[10px]">{l.pipeline_stage}</Badge>
                          </div>
                          <div className="text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                            {l.urgency && <span>{l.urgency}</span>}
                            {l.selected_plan && <span>Plan: {l.selected_plan}</span>}
                            <span>{fmtDate(l.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* FALLECIDO/A */}
            <TabsContent value="fallecido" className="space-y-4 mt-4">
              {deceasedFromCases.length === 0 ? (
                <EmptyHint text="Aún no hay datos de personas fallecidas asociadas a este titular." />
              ) : (
                deceasedFromCases.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{c.deceased_name}</h4>
                        <Link to={`/admin/casos?case=${c.id}`} className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                          {c.case_number} <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <Separator />
                      <Field label="RUT" value={c.deceased_rut} />
                      <Field label="Nacimiento" value={fmtDate(c.deceased_birth_date)} icon={Calendar} />
                      <Field label="Fallecimiento" value={fmtDate(c.deceased_death_date)} icon={Calendar} />
                      <Field label="Parentesco con titular" value={c.deceased_relationship} />
                      <Field label="Lugar ceremonia" value={c.ceremony_location} icon={MapPin} />
                      <Field label="Fecha ceremonia" value={fmtDate(c.ceremony_date, true)} icon={Calendar} />
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* FAMILIA */}
            <TabsContent value="familia" className="space-y-4 mt-4">
              {familyMembers.length === 0 ? (
                <EmptyHint text="Este titular aún no está asignado a un grupo familiar. Se creará automáticamente al vincular familiares en un caso." />
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {familyMembers.map((m) => (
                      <div key={m.id} className="p-3 border rounded-md flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {m.person?.full_name ?? "Sin nombre"}
                            {m.is_primary_contact && <Badge variant="outline" className="text-[10px] bg-gold/10 text-gold border-gold/30">Contacto principal</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                            {m.relationship && <span>{m.relationship}</span>}
                            {m.person?.phone && <span><Phone className="inline w-3 h-3 mr-1" />{m.person.phone}</span>}
                            {m.person?.email && <span><Mail className="inline w-3 h-3 mr-1" />{m.person.email}</span>}
                          </div>
                          {m.notes && <div className="text-[11px] text-muted-foreground mt-1 italic">{m.notes}</div>}
                        </div>
                        <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* PAGOS */}
            <TabsContent value="pagos" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <KpiBlock label="Total contratado" value={fmtCLP(totalContracted)} icon={CreditCard} />
                <KpiBlock label="Total pagado" value={fmtCLP(totalPaid)} icon={CreditCard} tone={totalPaid >= totalContracted && totalContracted > 0 ? "emerald" : "amber"} />
              </div>
              {payments.length === 0 ? (
                <EmptyHint text="Sin transacciones de pago registradas." />
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {payments.map((p) => (
                      <div key={p.id} className="p-3 border rounded-md flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{fmtCLP(p.amount)} <span className="text-[10px] text-muted-foreground">{p.currency}</span></div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                            {p.case_reference && <span>{p.case_reference}</span>}
                            {p.payment_method && <span>{p.payment_method}</span>}
                            <span>{fmtDate(p.paid_at ?? p.created_at, true)}</span>
                          </div>
                          {p.notes && <div className="text-[11px] text-muted-foreground italic">{p.notes}</div>}
                        </div>
                        <Badge variant="outline" className={
                          p.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          p.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-slate-50 text-slate-700"
                        }>{p.status}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* DOCUMENTOS */}
            <TabsContent value="documentos" className="space-y-4 mt-4">
              {documents.length === 0 ? (
                <EmptyHint text="Sin documentos cargados en los casos del titular." />
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    {documents.map((d) => {
                      const c = cases.find((x) => x.id === d.case_id);
                      return (
                        <div key={d.id} className="p-3 border rounded-md flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-sm flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                              {d.document_name}
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                              <span>{d.document_type}</span>
                              {c && (
                                <Link to={`/admin/casos?case=${c.id}`} className="text-primary hover:underline">{c.case_number}</Link>
                              )}
                              <span>{fmtDate(d.created_at)}</span>
                              {d.expires_at && <span>Vence: {fmtDate(d.expires_at)}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className={
                            d.status === "validado" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            d.status === "pendiente" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-slate-50 text-slate-700"
                          }>{d.status}</Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        <div className="border-t bg-muted/20 px-6 py-3 text-[10px] text-muted-foreground italic">
          Datos heredados automáticamente del expediente unificado. Cambios al titular se reflejan en todos los casos vinculados.
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ───────────────── helpers ───────────────── */

function Field({
  label, value, icon: Icon, multiline,
}: { label: string; value?: any; icon?: any; multiline?: boolean }) {
  if (value === undefined || value === null || value === "" || value === "—") {
    return (
      <div className="flex justify-between gap-3 py-1 border-b border-dashed last:border-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground/60 italic">—</span>
      </div>
    );
  }
  return (
    <div className={`flex ${multiline ? "flex-col gap-1" : "justify-between gap-3"} py-1 border-b border-dashed last:border-0`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs text-foreground font-medium inline-flex items-center gap-1 ${multiline ? "whitespace-pre-wrap" : "text-right"}`}>
        {Icon && <Icon className="w-3 h-3 text-muted-foreground" />}
        {String(value)}
      </span>
    </div>
  );
}

function KpiBlock({
  label, value, icon: Icon, tone = "slate",
}: { label: string; value: string; icon: any; tone?: "slate" | "emerald" | "amber" | "rose" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold opacity-80">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className="text-base font-semibold mt-1 truncate">{value}</div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-xs text-muted-foreground border border-dashed rounded-md p-4 text-center">{text}</div>
  );
}
