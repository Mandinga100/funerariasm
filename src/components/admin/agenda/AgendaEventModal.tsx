import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Save, Trash2, Phone, MapPin, Briefcase, Link as LinkIcon, Building2, Lock, Share2, X } from "lucide-react";
import { COMUNAS_RM } from "@/lib/comunas-rm";
import {
  AgendaEvent,
  AgendaEventType,
  AgendaPriority,
  AgendaStatus,
  AgendaVisibility,
  EVENT_TYPES,
  PRIORITIES,
  STATUS_COLUMNS,
  eventTypeOf,
} from "@/lib/agenda-config";
import AgendaConflictDialog, { type ConflictItem } from "@/components/admin/agenda/AgendaConflictDialog";

const ACTIVE_STATUSES: AgendaStatus[] = ["programado", "confirmado", "en_curso"];

export interface AgendaPrefill {
  title?: string;
  description?: string;
  eventType?: AgendaEventType;
  priority?: AgendaPriority;
  serviceCaseId?: string;
  leadId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  comuna?: string;
  internalNotes?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: AgendaEvent | null;
  defaultStatus?: AgendaStatus;
  defaultStart?: Date;
  prefill?: AgendaPrefill;
  onSaved: (createdEventId?: string) => void;
}

interface UserOption { user_id: string; display_name: string | null; }
interface CaseOption { id: string; case_number: string; client_name: string | null; }
interface LeadOption { id: string; name: string | null; phone: string | null; }

const toLocalInput = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AgendaEventModal({ open, onOpenChange, event, defaultStatus, defaultStart, prefill, onSaved }: Props) {
  const { user, isCeo, isAdmin } = useAuth();
  const { toast } = useToast();
  const isEdit = !!event;
  // Solo el dueño, admin/CEO pueden compartir y cambiar visibilidad.
  const canManageSharing = !!user && (isAdmin || isCeo || (event ? event.created_by === user.id : true));

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [conflictAcknowledged, setConflictAcknowledged] = useState(false);
  const [showConflictDlg, setShowConflictDlg] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<AgendaEventType>("reunion");
  const [status, setStatus] = useState<AgendaStatus>("programado");
  const [priority, setPriority] = useState<AgendaPriority>("normal");
  const [visibility, setVisibility] = useState<AgendaVisibility>("private");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [comuna, setComuna] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [serviceCaseId, setServiceCaseId] = useState<string>("");
  const [leadId, setLeadId] = useState<string>("");
  const [reminder, setReminder] = useState<number>(60);
  const [internalNotes, setInternalNotes] = useState("");

  // Compartidos: lista de { user_id, can_edit }
  const [sharedUsers, setSharedUsers] = useState<{ user_id: string; can_edit: boolean }[]>([]);
  const [shareUserPick, setShareUserPick] = useState<string>("");

  const [users, setUsers] = useState<UserOption[]>([]);
  const [allTeam, setAllTeam] = useState<UserOption[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);

  // Cargar opciones
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: roles }, { data: pf }, { data: cs }, { data: ld }] = await Promise.all([
        supabase.from("user_roles").select("user_id").in("role", ["admin", "ceo", "moderator"]),
        supabase.from("profiles").select("user_id, display_name"),
        supabase.from("service_cases").select("id, case_number, client_name").order("created_at", { ascending: false }).limit(100),
        supabase.from("contact_leads").select("id, name, phone").order("created_at", { ascending: false }).limit(100),
      ]);
      const allowedIds = new Set((roles ?? []).map(r => r.user_id));
      const teamProfiles = (pf ?? []).filter(p => allowedIds.has(p.user_id));
      // "users" para asignar = miembros con rol; "allTeam" = igual (todo el equipo con rol).
      setUsers(teamProfiles);
      setAllTeam(teamProfiles);
      setCases(cs ?? []);
      setLeads(ld ?? []);
    })();
  }, [open]);

  // Cargar compartidos del evento
  useEffect(() => {
    if (!open || !event) { setSharedUsers([]); return; }
    (async () => {
      const { data } = await supabase
        .from("agenda_event_shares")
        .select("shared_with_user_id, can_edit")
        .eq("event_id", event.id);
      setSharedUsers((data ?? []).map(r => ({ user_id: r.shared_with_user_id, can_edit: r.can_edit })));
    })();
  }, [open, event]);

  // Inicializar formulario
  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setEventType(event.event_type);
      setStatus(event.status);
      setPriority(event.priority);
      setVisibility(event.visibility ?? "private");
      setStartAt(toLocalInput(event.start_at));
      setEndAt(toLocalInput(event.end_at));
      setLocationName(event.location_name ?? "");
      setAddress(event.address ?? "");
      setComuna(event.comuna ?? "");
      setContactName(event.contact_name ?? "");
      setContactPhone(event.contact_phone ?? "");
      setContactEmail(event.contact_email ?? "");
      setAssignedTo(event.assigned_to ?? "");
      setServiceCaseId(event.service_case_id ?? "");
      setLeadId(event.lead_id ?? "");
      setReminder(event.reminder_minutes_before ?? 60);
      setInternalNotes(event.internal_notes ?? "");
    } else {
      const start = defaultStart ?? new Date(Date.now() + 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setTitle(prefill?.title ?? "");
      setDescription(prefill?.description ?? "");
      setEventType(prefill?.eventType ?? "reunion");
      setStatus(defaultStatus ?? "programado");
      setPriority(prefill?.priority ?? "normal");
      setVisibility("private");
      setStartAt(toLocalInput(start));
      setEndAt(toLocalInput(end));
      setLocationName("");
      setAddress("");
      setComuna(prefill?.comuna ?? "");
      setContactName(prefill?.contactName ?? "");
      setContactPhone(prefill?.contactPhone ?? "");
      setContactEmail(prefill?.contactEmail ?? "");
      setAssignedTo(user?.id ?? "");
      setServiceCaseId(prefill?.serviceCaseId ?? "");
      setLeadId(prefill?.leadId ?? "");
      setReminder(60);
      setInternalNotes(prefill?.internalNotes ?? "");
    }
    setConflicts([]);
  }, [open, event, defaultStatus, defaultStart, prefill, user?.id]);

  // Auto-ajustar end al cambiar tipo (si es nuevo)
  useEffect(() => {
    if (event || !startAt) return;
    const t = eventTypeOf(eventType);
    const start = new Date(startAt);
    const end = new Date(start.getTime() + t.defaultDurationMin * 60_000);
    setEndAt(toLocalInput(end));
  }, [eventType, event, startAt]);

  // Detectar conflictos (debounce básico). Cualquier cambio invalida la confirmación previa.
  useEffect(() => {
    setConflictAcknowledged(false);
    if (!assignedTo || !startAt || !endAt) { setConflicts([]); return; }
    const handle = setTimeout(async () => {
      const { data, error } = await supabase.rpc("detect_agenda_conflicts", {
        _user_id: assignedTo,
        _start: new Date(startAt).toISOString(),
        _end: new Date(endAt).toISOString(),
        _exclude_event_id: event?.id ?? null,
      });
      if (!error) {
        const list: ConflictItem[] = (data ?? []).map((r: any) => ({
          id: r.event_id, title: r.title, start_at: r.start_at, end_at: r.end_at,
        }));
        setConflicts(list);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [assignedTo, startAt, endAt, event?.id]);

  const linkedLabel = useMemo(() => {
    if (serviceCaseId) {
      const c = cases.find(x => x.id === serviceCaseId);
      return c ? `Caso ${c.case_number} — ${c.client_name ?? "Sin nombre"}` : null;
    }
    if (leadId) {
      const l = leads.find(x => x.id === leadId);
      return l ? `Lead: ${l.name ?? "Sin nombre"}` : null;
    }
    return null;
  }, [serviceCaseId, leadId, cases, leads]);

  const validate = (): string | null => {
    if (!title.trim()) return "El título es obligatorio";
    if (!startAt || !endAt) return "Debes definir inicio y fin";
    if (new Date(endAt) < new Date(startAt)) return "La hora de fin no puede ser anterior al inicio";
    return null;
  };

  const performSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      status,
      priority,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt).toISOString(),
      location_name: locationName.trim() || null,
      address: address.trim() || null,
      comuna: comuna || null,
      contact_name: contactName.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
      assigned_to: assignedTo || null,
      service_case_id: serviceCaseId || null,
      lead_id: leadId || null,
      reminder_minutes_before: reminder,
      internal_notes: internalNotes.trim() || null,
      visibility,
    };

    // Sincroniza la lista de compartidos para un evento existente o recién creado.
    const syncShares = async (eventId: string) => {
      if (!canManageSharing) return;
      // Borra todos y reinserta (lista corta, simple y consistente)
      await supabase.from("agenda_event_shares").delete().eq("event_id", eventId);
      if (sharedUsers.length > 0 && user?.id) {
        await supabase.from("agenda_event_shares").insert(
          sharedUsers.map(s => ({
            event_id: eventId,
            shared_with_user_id: s.user_id,
            shared_by: user.id,
            can_edit: s.can_edit,
          }))
        );
      }
    };

    if (isEdit && event) {
      const { error } = await supabase.from("agenda_events").update(payload).eq("id", event.id);
      if (error) {
        toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      } else {
        await syncShares(event.id);
        toast({ title: "✅ Evento actualizado" });
        onSaved();
        onOpenChange(false);
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("agenda_events")
        .insert({ ...payload, created_by: user.id })
        .select("id")
        .single();
      if (error) {
        toast({ title: "Error al crear", description: error.message, variant: "destructive" });
      } else {
        if (inserted?.id) await syncShares(inserted.id);
        const reminderTxt = reminder > 0
          ? ` Recordatorio en ${reminder >= 1440 ? `${reminder / 1440} día(s)` : reminder >= 60 ? `${reminder / 60} h` : `${reminder} min`} (sonora + WhatsApp + correo + CRM).`
          : "";
        toast({
          title: "✅ Evento agendado",
          description: `Notificación enviada al responsable.${reminderTxt}`,
        });
        onSaved(inserted?.id);
        onOpenChange(false);
      }
    }
    setSaving(false);
  };

  const save = async () => {
    const err = validate();
    if (err) { toast({ title: "Datos incompletos", description: err, variant: "destructive" }); return; }
    // Bloquear si hay conflictos no reconocidos para un estado activo
    if (
      conflicts.length > 0 &&
      !conflictAcknowledged &&
      ACTIVE_STATUSES.includes(status) &&
      assignedTo
    ) {
      setShowConflictDlg(true);
      return;
    }
    await performSave();
  };

  const handleConflictConfirm = async () => {
    setShowConflictDlg(false);
    setConflictAcknowledged(true);
    await performSave();
  };

  const remove = async () => {
    if (!event || !isCeo) return;
    if (!confirm("¿Eliminar este evento definitivamente? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    const { error } = await supabase.from("agenda_events").delete().eq("id", event.id);
    if (error) {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Evento eliminado" });
      onSaved();
      onOpenChange(false);
    }
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{eventTypeOf(eventType).emoji}</span>
            {isEdit ? "Editar evento" : "Nuevo evento de agenda"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Actualiza los detalles, estado o asignación del evento." : "Programa un nuevo evento operativo conectado al CRM."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflictos */}
          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-amber-900 dark:text-amber-200">Conflicto de horario detectado</p>
                <ul className="list-disc list-inside mt-1 text-amber-800 dark:text-amber-300">
                  {conflicts.slice(0, 3).map(c => (
                    <li key={c.id}>{c.title} — {new Date(c.start_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tipo + Título */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select value={eventType} onValueChange={v => setEventType(v as AgendaEventType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.emoji} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Título <span className="text-rose-500">*</span></label>
              <Input className="mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Velorio Sra. Pérez en Capilla Recoleta" />
            </div>
          </div>

          {/* Estado + Prioridad + Recordatorio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Estado</label>
              <Select value={status} onValueChange={v => setStatus(v as AgendaStatus)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_COLUMNS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
              <Select value={priority} onValueChange={v => setPriority(v as AgendaPriority)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Recordatorio (min antes)</label>
              <Select value={String(reminder)} onValueChange={v => setReminder(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 15, 30, 60, 120, 240, 1440].map(m => (
                    <SelectItem key={m} value={String(m)}>{m === 0 ? "Sin recordatorio" : m >= 1440 ? `${m / 1440} día(s)` : m >= 60 ? `${m / 60} h` : `${m} min`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reminder > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                  🔔 Alertas activas: sonora · WhatsApp · correo · CRM
                </p>
              )}
            </div>
          </div>

          {/* Tiempo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Inicio <span className="text-rose-500">*</span></label>
              <Input type="datetime-local" className="mt-1" value={startAt} onChange={e => setStartAt(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Fin <span className="text-rose-500">*</span></label>
              <Input type="datetime-local" className="mt-1" value={endAt} onChange={e => setEndAt(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Ubicación */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />Ubicación</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
              <Input placeholder="Lugar (ej: Capilla Recoleta)" value={locationName} onChange={e => setLocationName(e.target.value)} />
              <Input placeholder="Dirección" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <Select value={comuna || "__none__"} onValueChange={v => setComuna(v === "__none__" ? "" : v)}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Comuna" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin comuna —</SelectItem>
                {COMUNAS_RM.map(c => <SelectItem key={c.slug} value={c.nombre}>{c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Contacto */}
          <div>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />Contacto principal</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
              <Input placeholder="Nombre" value={contactName} onChange={e => setContactName(e.target.value)} />
              <Input placeholder="Teléfono" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
              <Input placeholder="Email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Asignación + Vinculación CRM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" />Responsable</label>
              <Select value={assignedTo || "__none__"} onValueChange={v => setAssignedTo(v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Asignar a" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sin asignar —</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.user_id} value={u.user_id}>{u.display_name ?? u.user_id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><LinkIcon className="w-3 h-3" />Vincular caso/lead</label>
              <Select
                value={serviceCaseId ? `case:${serviceCaseId}` : leadId ? `lead:${leadId}` : "__none__"}
                onValueChange={v => {
                  if (v === "__none__") { setServiceCaseId(""); setLeadId(""); }
                  else if (v.startsWith("case:")) { setServiceCaseId(v.slice(5)); setLeadId(""); }
                  else if (v.startsWith("lead:")) { setLeadId(v.slice(5)); setServiceCaseId(""); }
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Vincular" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sin vincular —</SelectItem>
                  {cases.length > 0 && (
                    <>
                      <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Casos</div>
                      {cases.slice(0, 50).map(c => (
                        <SelectItem key={c.id} value={`case:${c.id}`}>{c.case_number} — {c.client_name ?? "Sin nombre"}</SelectItem>
                      ))}
                    </>
                  )}
                  {leads.length > 0 && (
                    <>
                      <div className="px-2 pt-2 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Leads</div>
                      {leads.slice(0, 50).map(l => (
                        <SelectItem key={l.id} value={`lead:${l.id}`}>{l.name ?? "Sin nombre"} {l.phone ? `· ${l.phone}` : ""}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {linkedLabel && <Badge variant="secondary" className="mt-2 text-xs">{linkedLabel}</Badge>}
            </div>
          </div>

          {/* Visibilidad + Compartidos */}
          {canManageSharing && (
            <>
              <Separator />
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    {visibility === "team" ? <Building2 className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    Visibilidad
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Switch checked={visibility === "team"} onCheckedChange={(v) => setVisibility(v ? "team" : "private")} />
                    <span className="text-xs">
                      {visibility === "team"
                        ? "Empresarial — visible para todo el equipo"
                        : "Personal — solo creador, asignado, compartidos y administradores"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Share2 className="w-3 h-3" />Compartir con miembros del equipo</label>
                  <div className="flex gap-2 mt-1">
                    <Select value={shareUserPick || "__none__"} onValueChange={(v) => {
                      if (v === "__none__") return;
                      if (sharedUsers.some(s => s.user_id === v)) return;
                      setSharedUsers([...sharedUsers, { user_id: v, can_edit: false }]);
                      setShareUserPick("");
                    }}>
                      <SelectTrigger><SelectValue placeholder="Agregar persona…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Seleccionar —</SelectItem>
                        {allTeam
                          .filter(u => u.user_id !== user?.id && u.user_id !== assignedTo && !sharedUsers.some(s => s.user_id === u.user_id))
                          .map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.display_name ?? u.user_id.slice(0, 8)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {sharedUsers.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {sharedUsers.map((s) => {
                        const name = allTeam.find(u => u.user_id === s.user_id)?.display_name ?? s.user_id.slice(0, 8);
                        return (
                          <li key={s.user_id} className="flex items-center justify-between gap-2 text-xs border rounded-md px-2 py-1.5">
                            <span className="truncate">{name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <label className="flex items-center gap-1.5">
                                <Switch checked={s.can_edit} onCheckedChange={(v) =>
                                  setSharedUsers(sharedUsers.map(x => x.user_id === s.user_id ? { ...x, can_edit: v } : x))
                                } />
                                <span className="text-[11px]">{s.can_edit ? "Puede editar" : "Solo ver"}</span>
                              </label>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                                onClick={() => setSharedUsers(sharedUsers.filter(x => x.user_id !== s.user_id))}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Descripción + notas */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Descripción</label>
            <Textarea className="mt-1 min-h-[60px]" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles que debe conocer el equipo (transporte, vestimenta, particularidades)..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notas internas (privadas)</label>
            <Textarea className="mt-1 min-h-[60px]" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Notas para el equipo, no visibles a la familia." />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 mt-4">
          <div>
            {isEdit && isCeo && (
              <Button variant="destructive" size="sm" onClick={remove} disabled={deleting}>
                <Trash2 className="w-4 h-4 mr-1" />{deleting ? "Eliminando..." : "Eliminar"}
              </Button>
            )}
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />{saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear evento"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AgendaConflictDialog
        open={showConflictDlg}
        onOpenChange={setShowConflictDlg}
        conflicts={conflicts}
        assigneeId={assignedTo || null}
        assigneeName={assignedTo ? users.find(u => u.user_id === assignedTo)?.display_name ?? null : null}
        durationMin={
          startAt && endAt
            ? Math.max(15, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60_000))
            : eventTypeOf(eventType).defaultDurationMin
        }
        excludeEventId={event?.id ?? null}
        searchFrom={startAt ? new Date(startAt) : new Date()}
        context="save"
        onConfirm={handleConflictConfirm}
        onCancel={() => setShowConflictDlg(false)}
        onReschedule={(start, end) => {
          setStartAt(toLocalInput(start));
          setEndAt(toLocalInput(end));
          setShowConflictDlg(false);
          toast({
            title: "📅 Horario actualizado",
            description: "Revisa los nuevos horarios y guarda para confirmar.",
          });
        }}
      />
    </Dialog>
  );
}
