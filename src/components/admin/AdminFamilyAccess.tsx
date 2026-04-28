import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  KeyRound,
  Plus,
  Copy,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { generateSecureToken, generateRecoveryCode } from "@/lib/family-access";
import type { Tables } from "@/integrations/supabase/types";

type Memorial = Pick<Tables<"memorials">, "id" | "full_name" | "slug">;

interface FamilyAccess {
  id: string;
  memorial_id: string;
  family_email: string;
  family_name: string;
  is_active: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  last_used_at: string | null;
  expires_at: string;
  created_at: string;
  notes: string | null;
}

interface NewCredentials {
  token: string;
  recoveryCode: string;
  url: string;
  email: string;
  name: string;
  memorialName: string;
}

export default function AdminFamilyAccess() {
  const { toast } = useToast();
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [accesses, setAccesses] = useState<FamilyAccess[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [memorialId, setMemorialId] = useState("");
  const [familyEmail, setFamilyEmail] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [notes, setNotes] = useState("");

  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [newCreds, setNewCreds] = useState<NewCredentials | null>(null);
  const [showSecrets, setShowSecrets] = useState(true);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "last_used_desc" | "name_asc">("created_desc");
  const PAGE_SIZE = 8;


  const load = async () => {
    setLoading(true);
    const [memRes, accRes] = await Promise.all([
      supabase.from("memorials").select("id, full_name, slug").order("full_name"),
      supabase
        .from("memorial_family_access")
        .select("id, memorial_id, family_email, family_name, is_active, revoked_at, revoked_reason, last_used_at, expires_at, created_at, notes")
        .order("created_at", { ascending: false }),
    ]);
    setMemorials(memRes.data ?? []);
    setAccesses((accRes.data as FamilyAccess[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const memorialMap = Object.fromEntries(memorials.map((m) => [m.id, m]));

  const normalizedSearch = search.trim().toLowerCase();
  const filteredAccesses = normalizedSearch
    ? accesses.filter((acc) => {
        const mem = memorialMap[acc.memorial_id];
        const haystack = [
          acc.family_name,
          acc.family_email,
          acc.notes ?? "",
          mem?.full_name ?? "",
          mem?.slug ?? "",
        ].join(" ").toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : accesses;

  const sortedAccesses = [...filteredAccesses].sort((a, b) => {
    switch (sortBy) {
      case "created_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "last_used_desc": {
        const aT = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const bT = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        return bT - aT;
      }
      case "name_asc":
        return a.family_name.localeCompare(b.family_name, "es");
      case "created_desc":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedAccesses.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedAccesses = sortedAccesses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, sortBy]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);


  const handleCreate = async () => {
    if (!memorialId || !familyEmail || !familyName) {
      toast({ title: "Completa todos los campos requeridos", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sesión expirada", variant: "destructive" });
      return;
    }
    setCreating(true);
    const token = generateSecureToken();
    const recoveryCode = generateRecoveryCode();

    // Pedir hashes al servidor (solo CEO autorizado)
    const { data: hashes, error: hashError } = await supabase.rpc("hash_family_credentials", {
      _token: token,
      _recovery_code: recoveryCode,
    });
    if (hashError || !hashes || !Array.isArray(hashes) || hashes.length === 0) {
      setCreating(false);
      toast({ title: "Error generando credenciales", description: hashError?.message, variant: "destructive" });
      return;
    }
    const { token_hash, recovery_hash } = hashes[0] as { token_hash: string; recovery_hash: string };

    const { error: insertError } = await supabase.from("memorial_family_access").insert({
      memorial_id: memorialId,
      family_email: familyEmail.trim().toLowerCase(),
      family_name: familyName.trim(),
      access_token_hash: token_hash,
      recovery_code_hash: recovery_hash,
      created_by: user.id,
      notes: notes.trim() || null,
    });
    setCreating(false);

    if (insertError) {
      toast({ title: "Error al crear acceso", description: insertError.message, variant: "destructive" });
      return;
    }

    const memorialName = memorialMap[memorialId]?.full_name ?? "Memorial";
    const url = `${window.location.origin}/legados-eternos/acceso?t=${token}`;
    setNewCreds({ token, recoveryCode, url, email: familyEmail, name: familyName, memorialName });
    setCredentialsOpen(true);
    setCreateOpen(false);
    setMemorialId(""); setFamilyEmail(""); setFamilyName(""); setNotes("");
    load();
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`¿Revocar el acceso de ${name}? El familiar no podrá ingresar más con su link actual.`)) return;
    const { error } = await supabase
      .from("memorial_family_access")
      .update({ is_active: false, revoked_at: new Date().toISOString(), revoked_reason: "Revocado manualmente" })
      .eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Acceso revocado" }); load(); }
  };

  const handleReactivate = async (id: string) => {
    const { error } = await supabase
      .from("memorial_family_access")
      .update({
        is_active: true,
        revoked_at: null,
        revoked_reason: null,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Acceso reactivado por 30 días" }); load(); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar permanentemente el acceso de ${name}? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("memorial_family_access").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Acceso eliminado" }); load(); }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado al portapapeles` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="w-5 h-5 text-[#C5A059]" />
            <h2 className="text-lg sm:text-xl font-bold">Accesos Familiares</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Genera links únicos cifrados para que las familias gestionen su Legado Eterno · {accesses.length} accesos
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-[#C5A059] text-black hover:bg-[#C5A059]/90">
          <Plus className="w-4 h-4 mr-1" />
          Nuevo acceso
        </Button>
      </div>

      <Card className="border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="pt-6 flex items-start gap-3 text-sm">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Las credenciales solo se muestran una vez</p>
            <p className="text-amber-800/80 dark:text-amber-200/70 text-xs mt-1">
              Al crear un acceso verás el link único + código de recuperación. Cópialos antes de cerrar — no podrán recuperarse después
              porque están cifrados con SHA-256 y bcrypt en la base de datos.
            </p>
          </div>
        </CardContent>
      </Card>

      {!loading && accesses.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por familiar, email, memorial o slug…"
              className="pl-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="sm:w-[220px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Más recientes primero</SelectItem>
              <SelectItem value="created_asc">Más antiguos primero</SelectItem>
              <SelectItem value="last_used_desc">Último ingreso reciente</SelectItem>
              <SelectItem value="name_asc">Nombre (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : accesses.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <KeyRound className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">Aún no has generado accesos familiares.</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear primer acceso
          </Button>
        </div>
      ) : filteredAccesses.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Ningún acceso coincide con "{search}".</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>Limpiar búsqueda</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedAccesses.map((acc) => {
            const mem = memorialMap[acc.memorial_id];
            const expired = new Date(acc.expires_at) < new Date();
            const daysLeft = Math.ceil((new Date(acc.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <Card key={acc.id} className={!acc.is_active ? "opacity-60" : ""}>
                <CardContent className="pt-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm">{acc.family_name}</h3>
                        {acc.is_active ? (
                          expired ? (
                            <Badge variant="destructive" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />Expirado</Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                              <ShieldCheck className="w-3 h-3 mr-1" />Activo · {daysLeft}d
                            </Badge>
                          )
                        ) : (
                          <Badge variant="secondary" className="text-[10px]"><ShieldAlert className="w-3 h-3 mr-1" />Revocado</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Mail className="w-3 h-3" />{acc.family_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Memorial: <span className="text-foreground font-medium">{mem?.full_name ?? "—"}</span>
                      </p>
                      {acc.last_used_at && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Último ingreso: {new Date(acc.last_used_at).toLocaleString("es-CL")}
                        </p>
                      )}
                      {acc.notes && <p className="text-[11px] text-muted-foreground mt-1 italic">"{acc.notes}"</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {acc.is_active ? (
                        <Button size="sm" variant="outline" onClick={() => handleRevoke(acc.id, acc.family_name)}>
                          <ShieldAlert className="w-3.5 h-3.5 mr-1" />Revocar
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleReactivate(acc.id)}>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" />Reactivar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(acc.id, acc.family_name)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span>
                Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredAccesses.length)} de {filteredAccesses.length}
              </span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-2">Página {safePage} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog: Crear acceso */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generar acceso familiar</DialogTitle>
            <DialogDescription>
              Crea un link único cifrado y un código de recuperación de 12 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs uppercase tracking-wider">Memorial *</Label>
              <Select value={memorialId} onValueChange={setMemorialId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecciona un Legado Eterno" />
                </SelectTrigger>
                <SelectContent>
                  {memorials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Nombre del familiar *</Label>
              <Input className="mt-1.5" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="María Pérez" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Email del familiar *</Label>
              <Input className="mt-1.5" type="email" value={familyEmail} onChange={(e) => setFamilyEmail(e.target.value)} placeholder="familia@email.com" />
              <p className="text-[11px] text-muted-foreground mt-1">Se usa para recuperar el acceso si pierde su link.</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider">Notas internas (opcional)</Label>
              <Textarea className="mt-1.5" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Hija mayor, contacto principal…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-[#C5A059] text-black hover:bg-[#C5A059]/90">
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Generar credenciales
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Mostrar credenciales recién creadas */}
      <Dialog open={credentialsOpen} onOpenChange={(open) => { setCredentialsOpen(open); if (!open) setNewCreds(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Acceso generado para {newCreds?.name}
            </DialogTitle>
            <DialogDescription>
              <strong className="text-amber-700 dark:text-amber-300">Copia estos datos ahora.</strong> No podrás verlos nuevamente.
            </DialogDescription>
          </DialogHeader>
          {newCreds && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Memorial</div>
                <div className="font-medium text-sm">{newCreds.memorialName}</div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />Link único de acceso
                  </Label>
                  <button onClick={() => setShowSecrets((s) => !s)} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    {showSecrets ? <><EyeOff className="w-3 h-3" />Ocultar</> : <><Eye className="w-3 h-3" />Mostrar</>}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={showSecrets ? newCreds.url : "•".repeat(50)} className="font-mono text-xs" />
                  <Button size="sm" variant="outline" onClick={() => copyText(newCreds.url, "Link")}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <KeyRound className="w-3.5 h-3.5" />Código de recuperación (12 caracteres)
                </Label>
                <div className="flex gap-2">
                  <Input readOnly value={showSecrets ? newCreds.recoveryCode : "••••••••••••"} className="font-mono text-base font-bold tracking-widest text-center" />
                  <Button size="sm" variant="outline" onClick={() => copyText(newCreds.recoveryCode, "Código")}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  El familiar usará este código + su email si pierde el link.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border text-xs">
                <div className="font-semibold mb-1.5">📋 Mensaje sugerido para enviar:</div>
                <pre className="whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">{`Hola ${newCreds.name},

Te compartimos el acceso seguro al Legado Eterno de ${newCreds.memorialName}:

🔗 Link único: ${newCreds.url}

🔐 Código de recuperación (guárdalo): ${newCreds.recoveryCode}

Tu sesión es válida por 30 días renovables. Si pierdes el link, usa tu email (${newCreds.email}) y el código arriba para recuperarlo.

Funeraria Santa Margarita`}</pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() =>
                    copyText(
                      `Hola ${newCreds.name},\n\nTe compartimos el acceso seguro al Legado Eterno de ${newCreds.memorialName}:\n\n🔗 Link único: ${newCreds.url}\n\n🔐 Código de recuperación (guárdalo): ${newCreds.recoveryCode}\n\nTu sesión es válida por 30 días renovables. Si pierdes el link, usa tu email (${newCreds.email}) y el código arriba para recuperarlo.\n\nFuneraria Santa Margarita`,
                      "Mensaje completo",
                    )
                  }
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />Copiar mensaje completo
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setCredentialsOpen(false); setNewCreds(null); }}>
              Ya copié todo, cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
