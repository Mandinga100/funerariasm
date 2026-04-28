import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, UserPlus, Phone, Mail, MapPin, Hash, Loader2, AlertTriangle, CheckCircle2, Users, IdCard, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type MatchRow = {
  person_id: string;
  full_name: string;
  rut: string | null;
  phone: string | null;
  email: string | null;
  comuna: string | null;
  match_reason: string;
  confidence: number;
};

type PersonRow = {
  id: string;
  full_name: string;
  rut: string | null;
  phone: string | null;
  email: string | null;
  comuna: string | null;
  verified: boolean;
  source: string | null;
  created_at: string;
};

type MergeSuggestionRow = {
  id: string;
  source_person_id: string;
  candidate_person_id: string;
  match_reason: string;
  confidence: number;
  status: string;
  created_at: string;
  source_person?: { full_name: string; rut: string | null } | null;
  candidate_person?: { full_name: string; rut: string | null } | null;
};

const reasonLabel: Record<string, { text: string; tone: string }> = {
  rut_exacto: { text: "RUT exacto", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  telefono: { text: "Teléfono coincide", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  email: { text: "Email coincide", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  nombre_similar: { text: "Nombre similar", tone: "bg-slate-50 text-slate-700 border-slate-200" },
};

export default function AdminClientes360() {
  const { toast } = useToast();
  const [tab, setTab] = useState("rutificador");

  // Rutificador state
  const [q, setQ] = useState({ rut: "", phone: "", email: "", name: "" });
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<MatchRow[] | null>(null);

  // New person form
  const [creating, setCreating] = useState(false);
  const [newPerson, setNewPerson] = useState({
    full_name: "", rut: "", phone: "", email: "", comuna: "",
  });

  // Personas list
  const [persons, setPersons] = useState<PersonRow[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(false);
  const [personsFilter, setPersonsFilter] = useState("");

  // Merge suggestions
  const [suggestions, setSuggestions] = useState<MergeSuggestionRow[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);

  // Detalle de persona (Cliente 360)
  const [searchParams, setSearchParams] = useSearchParams();
  const openPersonId = searchParams.get("person");
  const [personDetail, setPersonDetail] = useState<any>(null);
  const [personCases, setPersonCases] = useState<any[]>([]);
  const [personLeads, setPersonLeads] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const openPerson = (id: string) => setSearchParams({ person: id });
  const closePerson = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("person");
    setSearchParams(next);
  };

  useEffect(() => {
    if (!openPersonId) {
      setPersonDetail(null);
      setPersonCases([]);
      setPersonLeads([]);
      return;
    }
    (async () => {
      setLoadingDetail(true);
      const [{ data: pData }, { data: cData }, { data: lData }] = await Promise.all([
        supabase.from("persons" as any).select("*").eq("id", openPersonId).maybeSingle(),
        supabase.from("service_cases").select("id, case_number, pipeline_stage, total_amount, deceased_name, created_at").eq("person_id", openPersonId).order("created_at", { ascending: false }),
        supabase.from("contact_leads").select("id, name, urgency, pipeline_stage, selected_plan, created_at").eq("person_id", openPersonId).order("created_at", { ascending: false }),
      ]);
      setPersonDetail(pData);
      setPersonCases((cData as any) ?? []);
      setPersonLeads((lData as any) ?? []);
      setLoadingDetail(false);
    })();
  }, [openPersonId]);

  const loadPersons = async () => {
    setLoadingPersons(true);
    const { data, error } = await supabase
      .from("persons" as any)
      .select("id, full_name, rut, phone, email, comuna, verified, source, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast({ title: "Error cargando personas", description: error.message, variant: "destructive" });
    setPersons((data as any) ?? []);
    setLoadingPersons(false);
  };

  const loadSuggestions = async () => {
    setLoadingSugg(true);
    const { data, error } = await supabase
      .from("person_merge_suggestions" as any)
      .select("id, source_person_id, candidate_person_id, match_reason, confidence, status, created_at")
      .eq("status", "pendiente")
      .order("confidence", { ascending: false })
      .limit(50);
    if (error) {
      toast({ title: "Error cargando sugerencias", description: error.message, variant: "destructive" });
      setLoadingSugg(false);
      return;
    }
    const rows = (data as any[]) ?? [];
    // Hidratar nombres de personas referenciadas
    const ids = Array.from(new Set(rows.flatMap((r) => [r.source_person_id, r.candidate_person_id])));
    if (ids.length) {
      const { data: peopleData } = await supabase
        .from("persons" as any)
        .select("id, full_name, rut")
        .in("id", ids);
      const map = new Map<string, any>((peopleData as any[] ?? []).map((p) => [p.id, p]));
      rows.forEach((r) => {
        r.source_person = map.get(r.source_person_id) ?? null;
        r.candidate_person = map.get(r.candidate_person_id) ?? null;
      });
    }
    setSuggestions(rows as any);
    setLoadingSugg(false);
  };

  useEffect(() => {
    loadPersons();
    loadSuggestions();
  }, []);

  const handleSearch = async () => {
    const hasInput = q.rut || q.phone || q.email || (q.name && q.name.length >= 2);
    if (!hasInput) {
      toast({ title: "Ingresa al menos un dato", description: "RUT, teléfono, email o nombre (≥2 caracteres)" });
      return;
    }
    setSearching(true);
    const { data, error } = await supabase.rpc("find_person_matches" as any, {
      _rut: q.rut || null,
      _phone: q.phone || null,
      _email: q.email || null,
      _name: q.name || null,
    });
    setSearching(false);
    if (error) {
      toast({ title: "Error en búsqueda", description: error.message, variant: "destructive" });
      return;
    }
    setMatches((data as any[]) ?? []);
  };

  const handleCreate = async () => {
    if (!newPerson.full_name || newPerson.full_name.trim().length < 2) {
      toast({ title: "Nombre requerido", description: "Mínimo 2 caracteres", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.rpc("upsert_person_by_identity" as any, {
      _full_name: newPerson.full_name,
      _rut: newPerson.rut || null,
      _phone: newPerson.phone || null,
      _email: newPerson.email || null,
      _comuna: newPerson.comuna || null,
      _source: "manual_360",
    });
    setCreating(false);
    if (error) {
      toast({ title: "No se pudo crear", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Persona registrada",
      description: data ? `ID: ${String(data).slice(0, 8)}…` : "OK",
    });
    setNewPerson({ full_name: "", rut: "", phone: "", email: "", comuna: "" });
    setMatches(null);
    loadPersons();
    loadSuggestions();
  };

  const handleResolveSuggestion = async (id: string, status: "aprobado" | "rechazado") => {
    const { error } = await supabase
      .from("person_merge_suggestions" as any)
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "aprobado" ? "Sugerencia marcada como válida" : "Sugerencia descartada" });
    loadSuggestions();
  };

  const filteredPersons = useMemo(() => {
    const f = personsFilter.trim().toLowerCase();
    if (!f) return persons;
    return persons.filter((p) =>
      [p.full_name, p.rut, p.phone, p.email, p.comuna].filter(Boolean).some((v) => String(v).toLowerCase().includes(f))
    );
  }, [persons, personsFilter]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes 360</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Expediente único de personas y familias. Evita duplicados y centraliza datos para Lead → Caso → Memorial.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          Etapa A · Capa de unificación activa
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="rutificador">
            <Search className="w-4 h-4 mr-2" /> Rutificador
          </TabsTrigger>
          <TabsTrigger value="personas">
            <Users className="w-4 h-4 mr-2" /> Personas ({persons.length})
          </TabsTrigger>
          <TabsTrigger value="merges">
            <AlertTriangle className="w-4 h-4 mr-2" /> Merges {suggestions.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white">{suggestions.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* RUTIFICADOR */}
        <TabsContent value="rutificador" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buscar persona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">RUT</label>
                  <Input placeholder="12.345.678-9" value={q.rut} onChange={(e) => setQ({ ...q, rut: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Teléfono</label>
                  <Input placeholder="+56 9 1234 5678" value={q.phone} onChange={(e) => setQ({ ...q, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input placeholder="correo@dominio.cl" value={q.email} onChange={(e) => setQ({ ...q, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Nombre</label>
                  <Input placeholder="Nombre o apellido" value={q.name} onChange={(e) => setQ({ ...q, name: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Buscar coincidencias
                </Button>
                <Button variant="outline" onClick={() => { setQ({ rut: "", phone: "", email: "", name: "" }); setMatches(null); }}>
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {matches !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {matches.length === 0 ? "Sin coincidencias" : `${matches.length} coincidencia(s)`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {matches.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No existe ninguna persona registrada con esos datos. Puedes crearla a continuación.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matches.map((m) => {
                      const tag = reasonLabel[m.match_reason] ?? reasonLabel.nombre_similar;
                      return (
                        <div key={m.person_id} className="flex items-start justify-between gap-3 p-3 border rounded-lg hover:bg-muted/40 transition">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{m.full_name}</div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                              {m.rut && <span><Hash className="inline w-3 h-3 mr-1" />{m.rut}</span>}
                              {m.phone && <span><Phone className="inline w-3 h-3 mr-1" />{m.phone}</span>}
                              {m.email && <span><Mail className="inline w-3 h-3 mr-1" />{m.email}</span>}
                              {m.comuna && <span><MapPin className="inline w-3 h-3 mr-1" />{m.comuna}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="outline" className={tag.tone}>{tag.text}</Badge>
                            <span className="text-[11px] text-muted-foreground">Confianza {m.confidence}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Registrar nueva persona
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Si el RUT ya existe se actualiza la ficha. Coincidencias por teléfono/email se envían a "Merges" para revisión.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Nombre completo *</label>
                  <Input value={newPerson.full_name} onChange={(e) => setNewPerson({ ...newPerson, full_name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">RUT</label>
                  <Input value={newPerson.rut} onChange={(e) => setNewPerson({ ...newPerson, rut: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Teléfono</label>
                  <Input value={newPerson.phone} onChange={(e) => setNewPerson({ ...newPerson, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <Input value={newPerson.email} onChange={(e) => setNewPerson({ ...newPerson, email: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Comuna</label>
                  <Input value={newPerson.comuna} onChange={(e) => setNewPerson({ ...newPerson, comuna: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                Crear / actualizar persona
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERSONAS */}
        <TabsContent value="personas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Personas registradas</CardTitle>
              <Input
                placeholder="Filtrar por nombre, RUT, teléfono…"
                value={personsFilter}
                onChange={(e) => setPersonsFilter(e.target.value)}
                className="max-w-xs"
              />
            </CardHeader>
            <CardContent>
              {loadingPersons ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando…</div>
              ) : filteredPersons.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Aún no hay personas registradas en el expediente unificado.
                </div>
              ) : (
                <div className="divide-y">
                  {filteredPersons.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openPerson(p.id)}
                      className="w-full text-left py-3 px-2 -mx-2 rounded-md flex items-start justify-between gap-3 hover:bg-muted/50 transition"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {p.full_name}
                          {p.verified && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          {p.rut && <span><Hash className="inline w-3 h-3 mr-1" />{p.rut}</span>}
                          {p.phone && <span><Phone className="inline w-3 h-3 mr-1" />{p.phone}</span>}
                          {p.email && <span><Mail className="inline w-3 h-3 mr-1" />{p.email}</span>}
                          {p.comuna && <span><MapPin className="inline w-3 h-3 mr-1" />{p.comuna}</span>}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground shrink-0">
                        {p.source && <Badge variant="outline" className="text-[10px]">{p.source}</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MERGES */}
        <TabsContent value="merges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sugerencias de merge pendientes</CardTitle>
              <p className="text-xs text-muted-foreground">
                Generadas automáticamente cuando dos personas comparten teléfono o email pero no RUT. Revisa antes de fusionar manualmente.
              </p>
            </CardHeader>
            <CardContent>
              {loadingSugg ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando…</div>
              ) : suggestions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No hay sugerencias pendientes. Todo limpio ✨
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => {
                    const tag = reasonLabel[s.match_reason] ?? reasonLabel.nombre_similar;
                    return (
                      <div key={s.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className={tag.tone}>{tag.text} · {s.confidence}%</Badge>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleResolveSuggestion(s.id, "rechazado")}>Descartar</Button>
                            <Button size="sm" onClick={() => handleResolveSuggestion(s.id, "aprobado")}>Marcar como válida</Button>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-muted/40 rounded">
                            <div className="text-[10px] text-muted-foreground">Persona nueva</div>
                            <div className="font-medium">{s.source_person?.full_name ?? s.source_person_id.slice(0, 8)}</div>
                            {s.source_person?.rut && <div className="text-muted-foreground">RUT: {s.source_person.rut}</div>}
                          </div>
                          <div className="p-2 bg-muted/40 rounded">
                            <div className="text-[10px] text-muted-foreground">Posible duplicado</div>
                            <div className="font-medium">{s.candidate_person?.full_name ?? s.candidate_person_id.slice(0, 8)}</div>
                            {s.candidate_person?.rut && <div className="text-muted-foreground">RUT: {s.candidate_person.rut}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
