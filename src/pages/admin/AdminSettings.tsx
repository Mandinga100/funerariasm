import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import RoleBadge from "@/components/admin/RoleBadge";
import { useToast } from "@/hooks/use-toast";
import { useAdminTheme } from "@/hooks/use-admin-theme";
import { useNotificationSound, getVolume, getNormalTone, getUrgentTone, type NormalTone, type UrgentTone } from "@/hooks/use-notification-sound";
import { useNotificationPrefsSync } from "@/hooks/use-notification-prefs-sync";
import { Slider } from "@/components/ui/slider";
import { signAvatarUrl, signAvatarUrls } from "@/lib/avatar-url";
import {
  Users, Shield, Bell, Moon, Sun, Monitor, BarChart3, Trash2,
  Plus, UserCog, Lock, Eye, EyeOff, Settings, FileText, AlertTriangle,
  Check, X, Download, Zap, Bot, Globe, Key, Mail, UserPlus, Pencil,
  Link2, Webhook, Brain, CloudCog, ScrollText, Search, ChevronLeft, ChevronRight,
  Filter, Volume2, VolumeX, Play
} from "lucide-react";

type AppRole = "ceo" | "admin" | "moderator";

/**
 * CEO fundador inamovible. Su rol CEO está protegido a nivel de base de datos
 * mediante el trigger `protect_founder_ceo` (ni siquiera otro CEO puede removerlo).
 * La UI también bloquea editar, eliminar o cambiar su rol.
 */
const FOUNDER_USER_ID = "637e3028-414a-4c56-b4a0-6895cd152683";
const isFounder = (userId: string | undefined | null) => userId === FOUNDER_USER_ID;

interface AdminUser {
  id: string;
  user_id: string;
  role: AppRole;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

const ROLE_META: Record<AppRole, { label: string; color: string; desc: string; icon: string }> = {
  ceo: { label: "CEO", color: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800", desc: "Control total del sistema, gestión de administradores y configuración global", icon: "👑" },
  admin: { label: "Administrador", color: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800", desc: "Acceso completo a leads, pagos, obituarios, memoriales y tracking", icon: "🔧" },
  moderator: { label: "Moderador", color: "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800", desc: "Gestión de contenido, condolencias y blog. Sin acceso a pagos ni configuración", icon: "📝" },
};



export default function AdminSettings() {
  const { user, isCeo } = useAuth();
  const { toast } = useToast();

  /* ── Admins State ── */
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [profileDialog, setProfileDialog] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [signedAvatarMap, setSignedAvatarMap] = useState<Record<string, string>>({});
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [addMode, setAddMode] = useState<"manual" | "invite">("manual");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("admin");
  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Preferences State ── */
  // Tema gestionado por el hook compartido (light/dark/system) — única fuente de verdad.
  const { theme, setTheme } = useAdminTheme();
  const [notifLeads, setNotifLeads] = useState(() => localStorage.getItem("crm_notif_leads") !== "false");
  const [notifPayments, setNotifPayments] = useState(() => localStorage.getItem("crm_notif_payments") !== "false");
  const [notifSound, setNotifSound] = useState(() => localStorage.getItem("admin_notification_sound") !== "false");
  const [soundVolume, setSoundVolume] = useState<number>(() => Math.round(getVolume() * 100));
  const [normalTone, setNormalTone] = useState<NormalTone>(() => getNormalTone());
  const [urgentTone, setUrgentTone] = useState<UrgentTone>(() => getUrgentTone());
  const { playNotification, playUrgentAlert } = useNotificationSound();
  const { savePrefs: savePrefsCloud, loading: prefsLoading } = useNotificationPrefsSync();
  const [wspNotif, setWspNotif] = useState(() => localStorage.getItem("crm_wsp_notif") === "true");
  const [wspNumber, setWspNumber] = useState(() => localStorage.getItem("crm_wsp_number") ?? "+56 9 6433 3760");

  // Re-hidrata los controles cuando llegan/cambian las preferencias en la nube (login, otro dispositivo).
  useEffect(() => {
    if (prefsLoading) return;
    setNotifSound(localStorage.getItem("admin_notification_sound") !== "false");
    setSoundVolume(Math.round(getVolume() * 100));
    setNormalTone(getNormalTone());
    setUrgentTone(getUrgentTone());
    setNotifLeads(localStorage.getItem("crm_notif_leads") !== "false");
    setNotifPayments(localStorage.getItem("crm_notif_payments") !== "false");
  }, [prefsLoading]);

  /* ── Security State ── */
  const [showPass, setShowPass] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  /* ── Integrations State (CEO only) ── */
  const [integrations, setIntegrations] = useState(() => {
    const saved = localStorage.getItem("crm_integrations");
    return saved ? JSON.parse(saved) : {
      whatsapp_api: { enabled: false, token: "", phone_id: "", template: "lead_urgente" },
      ai_classification: { enabled: true, model: "gemini-2.5-flash", auto_classify: true },
      webhook_leads: { enabled: false, url: "" },
      webhook_payments: { enabled: false, url: "" },
      email_smtp: { enabled: false, host: "", port: "587", user: "", from: "" },
      google_analytics: { enabled: false, measurement_id: "" },
    };
  });

  /* ── Audit Log State ── */
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(0);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditModuleFilter, setAuditModuleFilter] = useState("all");
  const AUDIT_PER_PAGE = 20;

  const loadAuditLogs = useCallback(async (page = 0, search = "", moduleFilter = "all") => {
    setAuditLoading(true);
    let query = supabase.from("audit_logs").select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * AUDIT_PER_PAGE, (page + 1) * AUDIT_PER_PAGE - 1);

    if (search) {
      query = query.or(`description.ilike.%${search}%,user_email.ilike.%${search}%,action.ilike.%${search}%`);
    }
    if (moduleFilter !== "all") {
      query = query.eq("module", moduleFilter);
    }

    const { data, count } = await query;
    setAuditLogs(data ?? []);
    setAuditTotal(count ?? 0);
    setAuditLoading(false);
  }, []);

  useEffect(() => {
    loadAuditLogs(auditPage, auditSearch, auditModuleFilter);
  }, [auditPage, auditSearch, auditModuleFilter, loadAuditLogs]);

  /* ── Load admins ── */
  const loadAdmins = async () => {
    setLoadingAdmins(true);
    const { data: roles } = await supabase.from("user_roles").select("id, user_id, role");
    if (!roles) { setLoadingAdmins(false); return; }

    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url");
    const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

    const adminList: AdminUser[] = roles.map(r => {
      const p = profileMap.get(r.user_id);
      return {
        id: r.id,
        user_id: r.user_id,
        role: r.role as AppRole,
        display_name: p?.display_name ?? undefined,
        avatar_url: p?.avatar_url ?? undefined,
        email: r.user_id === user?.id ? user.email ?? undefined : undefined,
      };
    });
    setAdmins(adminList);
    setLoadingAdmins(false);

    // Firmar avatares en paralelo (bucket privado)
    const signed = await signAvatarUrls(adminList.map(a => a.avatar_url));
    setSignedAvatarMap(signed);
  };

  useEffect(() => { loadAdmins(); }, []);

  /* ── Cargar perfil propio cuando se abre el dialog ── */
  const openOwnProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfileName(data?.display_name ?? "");
    setProfileAvatarUrl(data?.avatar_url ?? null);
    setProfileAvatarPreview(await signAvatarUrl(data?.avatar_url));
    setProfileDialog(true);
  };

  /* ── Subir avatar al bucket 'avatars' (privado, URL firmada) ── */
  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600", upsert: true,
      });
      if (upErr) throw upErr;
      // Guardamos el path (no URL pública); para mostrar usamos un signed URL
      setProfileAvatarUrl(path);
      const signed = await signAvatarUrl(path);
      setProfileAvatarPreview(signed);
      toast({ title: "Foto cargada", description: "Recuerde guardar para aplicar el cambio." });
    } catch (e: any) {
      toast({ title: "Error subiendo foto", description: e.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* ── Guardar perfil propio ── */
  const handleSaveOwnProfile = async () => {
    if (!user?.id) return;
    setSavingProfile(true);
    // Verificar si ya existe profile
    const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    const payload = {
      user_id: user.id,
      display_name: profileName.trim() || null,
      avatar_url: profileAvatarUrl,
    };
    const { error } = existing
      ? await supabase.from("profiles").update(payload).eq("user_id", user.id)
      : await supabase.from("profiles").insert(payload);
    setSavingProfile(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil actualizado" });
      logAudit({ action: "update_profile", module: "equipo", description: "Actualizó su nombre o foto de perfil" });
      setProfileDialog(false);
      loadAdmins();
    }
  };

  /* Tema: sincronización gestionada por useAdminTheme (no requiere efecto local). */

  /* ── Add admin by UUID ── */
  const handleAddByUserId = async (userId: string, role: AppRole) => {
    if (!isCeo && role === "ceo") {
      toast({ title: "Acceso denegado", description: "Solo el CEO puede asignar el rol de CEO.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Miembro agregado", description: `Rol ${ROLE_META[role].label} asignado correctamente.` });
      logAudit({ action: "add_member", module: "equipo", description: `Agregó miembro con rol ${ROLE_META[role].label}`, entity_type: "user_role", new_data: { user_id: userId, role } });
      loadAdmins();
    }
    setSaving(false);
    setAddDialog(false);
    resetAddForm();
  };

  /* ── Invite via email (registra invitación pendiente; el usuario crea su contraseña al registrarse) ── */
  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) return;
    if (!isCeo && (newRole === "ceo" || newRole === "admin")) {
      toast({ title: "Acceso denegado", description: "Solo el CEO puede asignar este rol.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: {
        email: inviteEmail.trim(),
        display_name: newDisplayName,
        role: newRole,
        mode: "invite",
      },
    });

    if (error || (data && (data as any).error)) {
      const msg = (data as any)?.error ?? error?.message ?? "No se pudo invitar al usuario.";
      toast({ title: "Error al invitar", description: msg, variant: "destructive" });
      setSaving(false);
      return;
    }

    const alreadyExisted = (data as any)?.already_existed === true;
    toast({
      title: alreadyExisted ? "Rol asignado" : "Invitación registrada",
      description: alreadyExisted
        ? `${inviteEmail} ya tenía cuenta. Se le asignó el rol ${ROLE_META[newRole].label}.`
        : `Avisa a ${inviteEmail} que ingrese al login del CRM (/login) y cree su cuenta con ese correo. Al registrarse recibirá automáticamente el rol ${ROLE_META[newRole].label}.`,
    });

    logAudit({ action: "invite_member", module: "equipo", description: `Invitó a ${inviteEmail} como ${ROLE_META[newRole].label}`, entity_type: "user_role", new_data: { email: inviteEmail, role: newRole } });
    loadAdmins();
    setSaving(false);
    setAddDialog(false);
    resetAddForm();
  };


  /* ── Create manual user (with password, via edge function) ── */
  const handleCreateManual = async () => {
    if (!newEmail.trim() || !newPassword.trim()) return;
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (!isCeo && (newRole === "ceo" || newRole === "admin")) {
      toast({ title: "Acceso denegado", description: "Solo el CEO puede asignar este rol.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data, error } = await supabase.functions.invoke("invite-team-member", {
      body: {
        email: newEmail.trim(),
        display_name: newDisplayName,
        role: newRole,
        mode: "manual",
        password: newPassword,
      },
    });

    if (error || (data && (data as any).error)) {
      const msg = (data as any)?.error ?? error?.message ?? "No se pudo crear el usuario.";
      toast({ title: "Error al crear usuario", description: msg, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({
      title: "Usuario creado",
      description: `${newEmail} creado como ${ROLE_META[newRole].label}. Ya puede iniciar sesión con la contraseña asignada.`,
    });
    logAudit({ action: "create_member", module: "equipo", description: `Creó usuario ${newEmail} como ${ROLE_META[newRole].label}`, entity_type: "user_role", new_data: { email: newEmail, role: newRole } });
    loadAdmins();
    setSaving(false);
    setAddDialog(false);
    resetAddForm();
  };

  const resetAddForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewDisplayName("");
    setInviteEmail("");
    setNewRole("admin");
    setAddMode("manual");
  };

  /* ── Update role ── */
  const handleUpdateRole = async (adminId: string, role: AppRole, targetUserId: string) => {
    if (!isCeo && role === "ceo") {
      toast({ title: "Acceso denegado", description: "Solo el CEO puede asignar el rol de CEO.", variant: "destructive" });
      return;
    }
    // Prevent non-CEO from changing a CEO's role
    const target = admins.find(a => a.id === adminId);
    if (target?.role === "ceo" && !isCeo) {
      toast({ title: "Acceso denegado", description: "Solo el CEO puede modificar roles de CEO.", variant: "destructive" });
      return;
    }
    // CEO fundador inamovible: ni siquiera otro CEO puede degradar su rol
    if (isFounder(targetUserId) && target?.role === "ceo" && role !== "ceo") {
      toast({
        title: "CEO fundador inamovible",
        description: "El rol CEO de Daniel Misle está protegido y no puede ser modificado.",
        variant: "destructive",
      });
      return;
    }
    const { error } = await supabase.from("user_roles").update({ role }).eq("id", adminId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rol actualizado" });
      logAudit({ action: "update_role", module: "equipo", description: `Cambió rol a ${ROLE_META[role].label}`, entity_type: "user_role", entity_id: adminId, old_data: { role: target?.role }, new_data: { role } });
      loadAdmins();
    }
  };

  /* ── Edit member ── */
  const handleEditMember = async () => {
    if (!selectedAdmin) return;
    if (!isCeo && selectedAdmin.role === "ceo") {
      toast({ title: "Acceso denegado", description: "No puede editar un CEO.", variant: "destructive" });
      setEditDialog(false);
      return;
    }
    // Bloqueo extra: nadie puede degradar al CEO fundador
    if (isFounder(selectedAdmin.user_id) && selectedAdmin.role === "ceo" && newRole !== "ceo") {
      toast({
        title: "CEO fundador inamovible",
        description: "El rol CEO de Daniel Misle no puede ser modificado.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    // Update display name in profiles
    if (newDisplayName.trim()) {
      await supabase.from("profiles").update({ display_name: newDisplayName.trim() }).eq("user_id", selectedAdmin.user_id);
    }
    // Update role if changed
    if (newRole !== selectedAdmin.role) {
      if (!isCeo && newRole === "ceo") {
        toast({ title: "Acceso denegado", description: "Solo el CEO puede asignar el rol de CEO.", variant: "destructive" });
        setSaving(false);
        return;
      }
      await supabase.from("user_roles").update({ role: newRole }).eq("id", selectedAdmin.id);
    }
    toast({ title: "Miembro actualizado" });
    loadAdmins();
    setSaving(false);
    setEditDialog(false);
  };

  /* ── Delete admin / moderator / CEO ── */
  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    if (selectedAdmin.user_id === user?.id) {
      toast({ title: "Error", description: "No puede eliminar su propio acceso.", variant: "destructive" });
      return;
    }
    if (selectedAdmin.role === "ceo" && !isCeo) {
      toast({ title: "Acceso denegado", description: "Solo el CEO puede remover a otro CEO.", variant: "destructive" });
      return;
    }
    // CEO fundador inamovible: ni siquiera otro CEO puede eliminarlo
    if (isFounder(selectedAdmin.user_id) && selectedAdmin.role === "ceo") {
      toast({
        title: "CEO fundador inamovible",
        description: "El rol CEO de Daniel Misle está protegido permanentemente y no puede ser removido.",
        variant: "destructive",
      });
      setDeleteDialog(false);
      setSelectedAdmin(null);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("user_roles").delete().eq("id", selectedAdmin.id);
    setSaving(false);
    if (error) {
      // El trigger protect_founder_ceo lanza un mensaje claro si intenta tocar al fundador
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    } else {
      const roleLabel = ROLE_META[selectedAdmin.role].label;
      toast({
        title: `${roleLabel} removido`,
        description: `${selectedAdmin.display_name ?? "El miembro"} ya no tiene acceso al CRM.`,
      });
      logAudit({
        action: "remove_member",
        module: "equipo",
        description: `Removió ${roleLabel} ${selectedAdmin.display_name ?? selectedAdmin.user_id.slice(0, 12)}`,
        entity_type: "user_role",
        entity_id: selectedAdmin.id,
        old_data: { role: selectedAdmin.role, user_id: selectedAdmin.user_id },
      });
      loadAdmins();
    }
    setDeleteDialog(false);
    setSelectedAdmin(null);
  };

  /* ── Change password ── */
  const handleChangePassword = async () => {
    if (newPass.length < 8) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (newPass !== confirmPass) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }
    setChangingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contraseña actualizada" });
      logAudit({ action: "change_password", module: "seguridad", description: "Cambió su contraseña de acceso" });
      setNewPass("");
      setConfirmPass("");
    }
    setChangingPass(false);
  };

  /* ── Save notification prefs (sincroniza en Lovable Cloud + cache local) ── */
  const saveNotifPrefs = async () => {
    // WhatsApp queda local (config de organización, no por usuario)
    localStorage.setItem("crm_wsp_notif", String(wspNotif));
    localStorage.setItem("crm_wsp_number", wspNumber);

    const { error } = await savePrefsCloud({
      sound_enabled: notifSound,
      volume: soundVolume / 100,
      normal_tone: normalTone,
      urgent_tone: urgentTone,
      notif_leads: notifLeads,
      notif_payments: notifPayments,
    });

    if (error) {
      toast({
        title: "Guardado local",
        description: "Las preferencias se aplicaron en este dispositivo, pero no se pudieron sincronizar con la nube.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Preferencias sincronizadas",
        description: "Volumen y tonos disponibles en todos tus dispositivos.",
      });
    }
  };

  /* ── Save integrations ── */
  const saveIntegrations = () => {
    localStorage.setItem("crm_integrations", JSON.stringify(integrations));
    toast({ title: "Integraciones guardadas", description: "La configuración se ha actualizado correctamente." });
  };

  const updateIntegration = (key: string, field: string, value: any) => {
    setIntegrations((prev: any) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  /* ── Export data ── */
  const exportData = async (table: string, filename: string) => {
    const { data } = await supabase.from(table as any).select("*").order("created_at", { ascending: false }).limit(1000);
    if (!data?.length) { toast({ title: "Sin datos para exportar" }); return; }
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filename} exportado` });
    logAudit({ action: "export", module: "informes", description: `Exportó ${filename}` });
  };

  const exportAuditCSV = async () => {
    const { data } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(5000);
    if (!data?.length) { toast({ title: "Sin registros de auditoría" }); return; }
    const headers = ["Fecha", "Email", "Rol", "Acción", "Módulo", "Descripción", "Entidad"];
    const rows = data.map((r: any) => [
      new Date(r.created_at).toLocaleString("es-CL"),
      r.user_email ?? "",
      r.user_role ?? "",
      r.action,
      r.module,
      `"${(r.description ?? "").replace(/"/g, '""')}"`,
      r.entity_type ?? "",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Log de auditoría exportado" });
  };

  /* ── Determine available roles for selects ── */
  // Solo el CEO puede asignar roles privilegiados (ceo, admin).
  // Los administradores únicamente pueden invitar moderadores.
  const availableRoles: AppRole[] = isCeo ? ["ceo", "admin", "moderator"] : ["moderator"];

  // Si el rol seleccionado deja de estar permitido (p. ej. admin sin permisos para "admin"),
  // lo corregimos automáticamente al primer rol disponible.
  useEffect(() => {
    if (!availableRoles.includes(newRole)) {
      setNewRole(availableRoles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCeo, addDialog, editDialog]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-[#C5A059]" />
          Configuración
        </h1>
        <p className="text-sm text-muted-foreground">Gestión del sistema CRM Funeraria Santa Margarita</p>
      </div>

      <Tabs defaultValue="team" className="space-y-4">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="team" className="flex-1 min-w-[80px] text-xs sm:text-sm gap-1">
            <Users className="w-3.5 h-3.5 hidden sm:inline" />Equipo
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1 min-w-[80px] text-xs sm:text-sm gap-1">
            <Moon className="w-3.5 h-3.5 hidden sm:inline" />Tema
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 min-w-[80px] text-xs sm:text-sm gap-1">
            <Bell className="w-3.5 h-3.5 hidden sm:inline" />Alertas
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1 min-w-[80px] text-xs sm:text-sm gap-1">
            <Shield className="w-3.5 h-3.5 hidden sm:inline" />Seguridad
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 min-w-[80px] text-xs sm:text-sm gap-1">
            <BarChart3 className="w-3.5 h-3.5 hidden sm:inline" />Informes
          </TabsTrigger>
          {isCeo && (
            <TabsTrigger value="audit" className="flex-1 min-w-[80px] text-xs sm:text-sm gap-1">
              <ScrollText className="w-3.5 h-3.5 hidden sm:inline" />Auditoría
            </TabsTrigger>
          )}
          {isCeo && (
            <TabsTrigger value="integrations" className="flex-1 min-w-[80px] text-xs sm:text-sm gap-1">
              <Zap className="w-3.5 h-3.5 hidden sm:inline" />Integraciones
            </TabsTrigger>
          )}
        </TabsList>

        {/* ═══════════════ TEAM TAB ═══════════════ */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg">Administradores del CRM</CardTitle>
                  <CardDescription>Gestione los permisos y roles de su equipo</CardDescription>
                </div>
                {isCeo && (
                  <Button size="sm" onClick={() => { resetAddForm(); setAddDialog(true); }}>
                    <Plus className="w-4 h-4 mr-1" />Agregar miembro
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Roles legend */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                {(Object.entries(ROLE_META) as [AppRole, typeof ROLE_META[AppRole]][]).map(([key, meta]) => (
                  <div key={key} className="flex items-start gap-2 p-2 rounded-lg border bg-muted/30">
                    <Badge className={`${meta.color} text-[10px] shrink-0`} variant="secondary">{meta.icon} {meta.label}</Badge>
                    <p className="text-[11px] text-muted-foreground leading-tight">{meta.desc}</p>
                  </div>
                ))}
              </div>

              <Separator className="mb-4" />

              {loadingAdmins ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
              ) : admins.length === 0 ? (
                <p className="text-center py-6 text-sm text-muted-foreground">No hay administradores registrados.</p>
              ) : (
                <div className="space-y-2">
                  {admins.map(admin => {
                    const founder = isFounder(admin.user_id) && admin.role === "ceo";
                    const isSelf = admin.user_id === user?.id;
                    // El fundador es inamovible: nadie puede gestionar su rol CEO ni eliminarlo
                    const canManage = isCeo && !isSelf && !founder;
                    const canChangeRole = isCeo && !founder;
                    const initials = (admin.display_name ?? admin.email ?? admin.user_id).slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={admin.id}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border transition-colors",
                          isSelf
                            ? "bg-[#C5A059]/5 border-[#C5A059]/40 hover:bg-[#C5A059]/10 cursor-pointer"
                            : "hover:bg-muted/30",
                          founder && !isSelf && "border-[#C5A059]/40 bg-[#C5A059]/5"
                        )}
                        onClick={isSelf ? openOwnProfile : undefined}
                        title={isSelf ? "Click para editar tu nombre y foto" : (founder ? "CEO fundador inamovible" : undefined)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 overflow-hidden flex items-center justify-center shrink-0">
                            {admin.avatar_url && signedAvatarMap[admin.avatar_url] ? (
                              <img src={signedAvatarMap[admin.avatar_url]} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-semibold text-[#C5A059]">{initials}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{admin.display_name ?? admin.email ?? admin.user_id.slice(0, 8) + "..."}</span>
                              <RoleBadge
                                isCeo={admin.role === "ceo"}
                                isAdmin={admin.role === "admin"}
                                compact
                              />
                              {isSelf && <Pencil className="w-3 h-3 text-[#C5A059]" />}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {admin.email ?? `ID: ${admin.user_id.slice(0, 12)}...`}
                              {isSelf && <span className="ml-1 text-[#C5A059] font-medium">(Tú — click para editar)</span>}
                              {founder && !isSelf && <span className="ml-1 text-[#C5A059] font-medium">· CEO fundador</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-12 sm:ml-0" onClick={(e) => e.stopPropagation()}>
                          {canChangeRole ? (
                            <Select
                              value={admin.role}
                              onValueChange={(v) => handleUpdateRole(admin.id, v as AppRole, admin.user_id)}
                            >
                              <SelectTrigger className="h-8 w-[130px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles.map(r => (
                                  <SelectItem key={r} value={r}>{ROLE_META[r].icon} {ROLE_META[r].label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={`${ROLE_META[admin.role].color} text-xs`} variant="secondary">
                              {ROLE_META[admin.role].icon} {ROLE_META[admin.role].label}
                            </Badge>
                          )}
                          {canManage && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Editar"
                                onClick={() => {
                                  setSelectedAdmin(admin);
                                  setNewDisplayName(admin.display_name ?? "");
                                  setNewRole(admin.role);
                                  setEditDialog(true);
                                }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" title="Eliminar"
                                onClick={() => { setSelectedAdmin(admin); setDeleteDialog(true); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!isCeo && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Solo el CEO puede agregar, editar o eliminar miembros del equipo. Contacte al CEO para solicitar cambios.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ APPEARANCE TAB ═══════════════ */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Tema de la interfaz</CardTitle>
              <CardDescription>Seleccione el modo visual del CRM. La opción "Sistema" sigue automáticamente la preferencia de su dispositivo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    theme === "light"
                      ? "border-accent ring-2 ring-accent/20 bg-accent/5"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <Sun className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium">Claro</p>
                  <p className="text-[11px] text-muted-foreground">Interfaz luminosa</p>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    theme === "dark"
                      ? "border-accent ring-2 ring-accent/20 bg-accent/5"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <Moon className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
                  <p className="text-sm font-medium">Oscuro</p>
                  <p className="text-[11px] text-muted-foreground">Reduce fatiga visual</p>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-center",
                    theme === "system"
                      ? "border-accent ring-2 ring-accent/20 bg-accent/5"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <Monitor className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Sistema</p>
                  <p className="text-[11px] text-muted-foreground">Sigue su dispositivo</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ NOTIFICATIONS TAB ═══════════════ */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Preferencias de Notificación</CardTitle>
              <CardDescription>Configure cómo y cuándo recibir alertas del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-medium">Nuevos leads</p><p className="text-xs text-muted-foreground">Notificación al recibir un nuevo contacto</p></div>
                  <Switch checked={notifLeads} onCheckedChange={setNotifLeads} />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-medium">Pagos pendientes</p><p className="text-xs text-muted-foreground">Alerta al recibir un pago por verificar</p></div>
                  <Switch checked={notifPayments} onCheckedChange={setNotifPayments} />
                </div>
                <Separator />
                <div className="space-y-4 rounded-lg border bg-muted/30 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {notifSound && soundVolume > 0 ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium">Sonido de notificación</p>
                        <p className="text-xs text-muted-foreground">Reproducir alerta al recibir eventos en tiempo real</p>
                      </div>
                    </div>
                    <Switch checked={notifSound} onCheckedChange={setNotifSound} />
                  </div>

                  {notifSound && (
                    <>
                      {/* Volumen */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Volumen</Label>
                          <span className="text-xs tabular-nums text-muted-foreground">{soundVolume}%</span>
                        </div>
                        <Slider
                          value={[soundVolume]}
                          onValueChange={([v]) => setSoundVolume(v)}
                          min={0}
                          max={100}
                          step={5}
                          aria-label="Volumen de notificaciones"
                        />
                      </div>

                      {/* Tono normal */}
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-end gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Tono normal</Label>
                          <Select value={normalTone} onValueChange={(v: NormalTone) => setNormalTone(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="soft">🔔 Suave (sine)</SelectItem>
                              <SelectItem value="ping">📍 Ping (dos tonos)</SelectItem>
                              <SelectItem value="chime">🎶 Campana (triple)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => playNotification({ volume: soundVolume / 100, tone: normalTone })}
                        >
                          <Play className="w-3.5 h-3.5" /> Probar
                        </Button>
                      </div>

                      {/* Tono urgente */}
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-end gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium flex items-center gap-1.5">
                            Tono urgente <Badge variant="destructive" className="h-4 text-[9px] px-1">URGENTE</Badge>
                          </Label>
                          <Select value={urgentTone} onValueChange={(v: UrgentTone) => setUrgentTone(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="alarm">🚨 Alarma (ascendente)</SelectItem>
                              <SelectItem value="siren">🚓 Sirena (oscilante)</SelectItem>
                              <SelectItem value="pulse">⚡ Pulso (square)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => playUrgentAlert({ volume: soundVolume / 100, tone: urgentTone })}
                        >
                          <Play className="w-3.5 h-3.5" /> Probar
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-sm font-medium">Notificaciones WhatsApp</p><p className="text-xs text-muted-foreground">Enviar alerta al WhatsApp cuando entre un lead urgente</p></div>
                    <Switch checked={wspNotif} onCheckedChange={setWspNotif} />
                  </div>
                  {wspNotif && (
                    <div>
                      <Label className="text-xs">Número WhatsApp</Label>
                      <Input value={wspNumber} onChange={e => setWspNumber(e.target.value)} className="mt-1" placeholder="+56 9 XXXX XXXX" />
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={saveNotifPrefs} className="w-full sm:w-auto">Guardar preferencias</Button>
            </CardContent>
          </Card>

          {/* KPI Weekly Report */}
          <Card className="border-dashed border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Reporte Semanal de KPIs
              </CardTitle>
              <CardDescription>
                Se genera automáticamente cada lunes a las 8:00 AM y se envía como notificación interna a todos los administradores.
                <br />
                <span className="text-xs font-medium mt-1 block">
                  📧 Destinatarios: funerariasantamargarita2026@gmail.com, mandinga_atim@hotmail.com
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Umbrales de Alerta</p>
                  <ul className="space-y-1 text-xs">
                    <li className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive inline-block" /> Leads vencidos {">"} 3</li>
                    <li className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Conversión {"<"} 10%</li>
                    <li className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Respuesta {">"} 2 horas</li>
                    <li className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Pagos pendientes {">"} 5</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Incluye</p>
                  <ul className="space-y-1 text-xs">
                    <li>📊 KPIs semanales vs semana anterior</li>
                    <li>⚠️ Alertas críticas automáticas</li>
                    <li>📈 Tendencias de leads e ingresos</li>
                    <li>💡 Resumen ejecutivo generado por IA</li>
                  </ul>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  toast({ title: "Generando reporte...", description: "Esto puede tomar unos segundos." });
                  try {
                    const { data, error } = await supabase.functions.invoke("weekly-kpi-report");
                    if (error) throw error;
                    if (data?.error) throw new Error(data.error);
                    const alerts = data?.report?.alerts ?? [];
                    toast({
                      title: "✅ Reporte generado",
                      description: alerts.length > 0
                        ? `${alerts.length} alerta(s) detectada(s). Revise sus notificaciones.`
                        : "Sin alertas críticas. Notificación enviada al equipo.",
                    });
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message, variant: "destructive" });
                  }
                }}
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                Generar Reporte Ahora (Manual)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ SECURITY TAB ═══════════════ */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Cambiar Contraseña</CardTitle>
              <CardDescription>Actualice su contraseña de acceso al CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Nueva contraseña</Label>
                <div className="relative mt-1">
                  <Input type={showPass ? "text" : "password"} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 8 caracteres" />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Confirmar contraseña</Label>
                <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="mt-1" placeholder="Repita la contraseña" />
              </div>
              {newPass && confirmPass && newPass !== confirmPass && (
                <p className="text-xs text-destructive flex items-center gap-1"><X className="w-3 h-3" />Las contraseñas no coinciden</p>
              )}
              {newPass && confirmPass && newPass === confirmPass && newPass.length >= 8 && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"><Check className="w-3 h-3" />Las contraseñas coinciden</p>
              )}
              <Button onClick={handleChangePassword} disabled={changingPass || !newPass || newPass !== confirmPass || newPass.length < 8}>
                {changingPass ? "Actualizando..." : "Cambiar contraseña"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Información de Sesión</CardTitle>
              <CardDescription>Datos de su sesión actual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span className="font-medium truncate ml-2">{user?.email}</span></div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">ID de usuario</span><code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate ml-2">{user?.id?.slice(0, 16)}...</code></div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Último acceso</span><span className="text-xs">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("es-CL") : "—"}</span></div>
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nivel de acceso</span><Badge className={isCeo ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300" : "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300"} variant="secondary">{isCeo ? "👑 CEO" : "🔧 Admin"}</Badge></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2"><Shield className="w-4 h-4 text-[#C5A059]" />Políticas de Seguridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" /><span>Contraseñas mínimas de 8 caracteres</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" /><span>Verificación de email obligatoria para nuevos usuarios</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" /><span>Solo el CEO puede asignar roles de CEO y Admin</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" /><span>Row Level Security (RLS) en todas las tablas</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" /><span>Sesiones con token JWT y refresco automático</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" /><span>Registro de actividad en leads y pagos</span></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ REPORTS TAB ═══════════════ */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Exportar Informes</CardTitle>
              <CardDescription>Descargue datos del sistema en formato CSV</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { fn: () => exportData("contact_leads", "leads"), icon: Users, bgColor: "bg-blue-100 dark:bg-blue-950/40", iconColor: "text-blue-600 dark:text-blue-400", title: "Exportar Leads", desc: "Contactos y clasificación" },
                  { fn: () => exportData("payment_transactions", "pagos"), icon: FileText, bgColor: "bg-green-100 dark:bg-green-950/40", iconColor: "text-green-600 dark:text-green-400", title: "Exportar Pagos", desc: "Historial de transacciones" },
                  { fn: () => exportData("family_tracking", "tracking"), icon: Globe, bgColor: "bg-purple-100 dark:bg-purple-950/40", iconColor: "text-purple-600 dark:text-purple-400", title: "Exportar Tracking", desc: "Seguimiento de servicios" },
                  { fn: () => exportData("obituaries", "obituarios"), icon: FileText, bgColor: "bg-gray-100 dark:bg-gray-800", iconColor: "text-gray-600 dark:text-gray-400", title: "Exportar Obituarios", desc: "Registros de obituarios" },
                ].map((item, idx) => (
                  <button key={idx} onClick={item.fn} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                    <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center shrink-0`}>
                      <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Download className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ AUDIT LOG TAB ═══════════════ */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-[#C5A059]" />
                Log de Auditoría
              </CardTitle>
              <CardDescription>Registro completo de todas las acciones realizadas por los administradores del CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por acción, email o descripción..."
                    value={auditSearch}
                    onChange={e => { setAuditSearch(e.target.value); setAuditPage(0); }}
                    className="pl-9 text-sm"
                  />
                </div>
                <Select value={auditModuleFilter} onValueChange={v => { setAuditModuleFilter(v); setAuditPage(0); }}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los módulos</SelectItem>
                    <SelectItem value="rls_block">🚫 Accesos bloqueados (RLS)</SelectItem>
                    <SelectItem value="equipo">Equipo</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="pagos">Pagos</SelectItem>
                    <SelectItem value="obituarios">Obituarios</SelectItem>
                    <SelectItem value="memoriales">Memoriales</SelectItem>
                    <SelectItem value="tracking">Tracking</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                    <SelectItem value="seguridad">Seguridad</SelectItem>
                    <SelectItem value="configuracion">Configuración</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => exportAuditCSV()}>
                  <Download className="w-4 h-4 mr-1" />CSV
                </Button>
              </div>

              {/* Log entries */}
              {auditLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No hay registros de auditoría</p>
                  <p className="text-xs mt-1">Las acciones de los administradores aparecerán aquí</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {auditLogs.map(log => {
                    const actionColors: Record<string, string> = {
                      add_member: "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300",
                      remove_member: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300",
                      update_role: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300",
                      change_password: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300",
                      update_lead: "bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300",
                      delete: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300",
                      create: "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300",
                      update: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300",
                      export: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200",
                      login: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300",
                      rls_block: "bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-200 border border-red-300 dark:border-red-800",
                    };
                    const isRlsBlock = log.action === "rls_block";
                    const badgeClass = actionColors[log.action] ?? "bg-muted text-muted-foreground";
                    const date = new Date(log.created_at);
                    const meta = log.new_data ?? {};
                    return (
                      <div
                        key={log.id}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors",
                          isRlsBlock && "bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/60"
                        )}
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                            {date.toLocaleDateString("es-CL")} {date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <Badge className={`${badgeClass} text-[10px] px-1.5 py-0`} variant="secondary">
                            {isRlsBlock ? "🚫 acceso bloqueado" : log.action.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs truncate", isRlsBlock && "font-medium text-red-900 dark:text-red-200")}>
                            {log.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            <span className="font-medium">{log.user_email ?? "Sistema"}</span>
                            {log.user_role && ` · ${log.user_role}`}
                            {!isRlsBlock && ` · ${log.module}`}
                            {!isRlsBlock && log.entity_type && ` · ${log.entity_type}`}
                            {isRlsBlock && meta.table && ` · tabla ${meta.table}`}
                            {isRlsBlock && meta.operation && ` · ${String(meta.operation).toUpperCase()}`}
                            {isRlsBlock && meta.pathname && ` · ${meta.pathname}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {auditTotal > AUDIT_PER_PAGE && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    {auditPage * AUDIT_PER_PAGE + 1}-{Math.min((auditPage + 1) * AUDIT_PER_PAGE, auditTotal)} de {auditTotal}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={auditPage === 0} onClick={() => setAuditPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={(auditPage + 1) * AUDIT_PER_PAGE >= auditTotal} onClick={() => setAuditPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ INTEGRATIONS TAB (CEO ONLY) ═══════════════ */}
        {isCeo && (
          <TabsContent value="integrations" className="space-y-4">
            {/* WhatsApp Business API */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Business API
                </CardTitle>
                <CardDescription>Notificaciones automáticas a WhatsApp para leads urgentes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between"><Label className="text-sm">Activar integración</Label><Switch checked={integrations.whatsapp_api.enabled} onCheckedChange={v => updateIntegration("whatsapp_api", "enabled", v)} /></div>
                {integrations.whatsapp_api.enabled && (
                  <div className="space-y-3 pl-0 sm:pl-4 border-l-2 border-green-200 ml-0 sm:ml-2">
                    <div><Label className="text-xs">Access Token</Label><Input type="password" value={integrations.whatsapp_api.token} onChange={e => updateIntegration("whatsapp_api", "token", e.target.value)} className="mt-1 font-mono text-xs" placeholder="EAAxxxxxxx..." /></div>
                    <div><Label className="text-xs">Phone Number ID</Label><Input value={integrations.whatsapp_api.phone_id} onChange={e => updateIntegration("whatsapp_api", "phone_id", e.target.value)} className="mt-1 font-mono text-xs" placeholder="1234567890" /></div>
                    <div><Label className="text-xs">Nombre de Template</Label><Input value={integrations.whatsapp_api.template} onChange={e => updateIntegration("whatsapp_api", "template", e.target.value)} className="mt-1 text-xs" placeholder="lead_urgente" /></div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Classification */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2"><Brain className="w-5 h-5 text-purple-600" />Clasificación con IA</CardTitle>
                <CardDescription>Configuración del modelo de IA para clasificación automática de leads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between"><Label className="text-sm">Clasificación automática</Label><Switch checked={integrations.ai_classification.auto_classify} onCheckedChange={v => updateIntegration("ai_classification", "auto_classify", v)} /></div>
                <div>
                  <Label className="text-xs">Modelo de IA</Label>
                  <Select value={integrations.ai_classification.model} onValueChange={v => updateIntegration("ai_classification", "model", v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (rápido)</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (preciso)</SelectItem>
                      <SelectItem value="gpt-5-mini">GPT-5 Mini (balanceado)</SelectItem>
                      <SelectItem value="gpt-5">GPT-5 (máxima calidad)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Webhooks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2"><Webhook className="w-5 h-5 text-orange-600" />Webhooks</CardTitle>
                <CardDescription>Envíe datos en tiempo real a sistemas externos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label className="text-sm">Webhook de Leads</Label><Switch checked={integrations.webhook_leads.enabled} onCheckedChange={v => updateIntegration("webhook_leads", "enabled", v)} /></div>
                  {integrations.webhook_leads.enabled && (
                    <div><Label className="text-xs">URL del Webhook</Label><Input value={integrations.webhook_leads.url} onChange={e => updateIntegration("webhook_leads", "url", e.target.value)} className="mt-1 text-xs" placeholder="https://hooks.zapier.com/..." /></div>
                  )}
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label className="text-sm">Webhook de Pagos</Label><Switch checked={integrations.webhook_payments.enabled} onCheckedChange={v => updateIntegration("webhook_payments", "enabled", v)} /></div>
                  {integrations.webhook_payments.enabled && (
                    <div><Label className="text-xs">URL del Webhook</Label><Input value={integrations.webhook_payments.url} onChange={e => updateIntegration("webhook_payments", "url", e.target.value)} className="mt-1 text-xs" placeholder="https://hooks.zapier.com/..." /></div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Email SMTP */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2"><Mail className="w-5 h-5 text-blue-600" />Email SMTP</CardTitle>
                <CardDescription>Configure correo saliente para notificaciones del sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between"><Label className="text-sm">Activar SMTP personalizado</Label><Switch checked={integrations.email_smtp.enabled} onCheckedChange={v => updateIntegration("email_smtp", "enabled", v)} /></div>
                {integrations.email_smtp.enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><Label className="text-xs">Host SMTP</Label><Input value={integrations.email_smtp.host} onChange={e => updateIntegration("email_smtp", "host", e.target.value)} className="mt-1 text-xs" placeholder="smtp.gmail.com" /></div>
                    <div><Label className="text-xs">Puerto</Label><Input value={integrations.email_smtp.port} onChange={e => updateIntegration("email_smtp", "port", e.target.value)} className="mt-1 text-xs" placeholder="587" /></div>
                    <div><Label className="text-xs">Usuario</Label><Input value={integrations.email_smtp.user} onChange={e => updateIntegration("email_smtp", "user", e.target.value)} className="mt-1 text-xs" placeholder="correo@dominio.com" /></div>
                    <div><Label className="text-xs">Remitente (From)</Label><Input value={integrations.email_smtp.from} onChange={e => updateIntegration("email_smtp", "from", e.target.value)} className="mt-1 text-xs" placeholder="Funeraria Santa Margarita <no-reply@...>" /></div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Google Analytics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-yellow-600" />Google Analytics</CardTitle>
                <CardDescription>Conecte su cuenta de Analytics para medir tráfico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between"><Label className="text-sm">Activar Analytics</Label><Switch checked={integrations.google_analytics.enabled} onCheckedChange={v => updateIntegration("google_analytics", "enabled", v)} /></div>
                {integrations.google_analytics.enabled && (
                  <div><Label className="text-xs">Measurement ID</Label><Input value={integrations.google_analytics.measurement_id} onChange={e => updateIntegration("google_analytics", "measurement_id", e.target.value)} className="mt-1 font-mono text-xs" placeholder="G-XXXXXXXXXX" /></div>
                )}
              </CardContent>
            </Card>

            <Button onClick={saveIntegrations} className="w-full sm:w-auto" size="lg">
              <CloudCog className="w-4 h-4 mr-2" />Guardar todas las integraciones
            </Button>
          </TabsContent>
        )}
      </Tabs>

      {/* ═══════════════ ADD MEMBER DIALOG ═══════════════ */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#C5A059]" />Agregar miembro al equipo</DialogTitle>
            <DialogDescription>Elija cómo agregar al nuevo miembro del CRM</DialogDescription>
          </DialogHeader>

          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setAddMode("manual")}
              className={`p-3 rounded-lg border-2 text-center transition-all ${addMode === "manual" ? "border-[#C5A059] bg-[#C5A059]/5" : "border-muted hover:border-muted-foreground/30"}`}
            >
              <Mail className="w-5 h-5 mx-auto mb-1 text-[#C5A059]" />
              <p className="text-xs font-medium">Invitar por correo</p>
              <p className="text-[10px] text-muted-foreground">Asignar correo y contraseña</p>
            </button>
            <button
              onClick={() => setAddMode("invite")}
              className={`p-3 rounded-lg border-2 text-center transition-all ${addMode === "invite" ? "border-[#C5A059] bg-[#C5A059]/5" : "border-muted hover:border-muted-foreground/30"}`}
            >
              <Key className="w-5 h-5 mx-auto mb-1 text-[#C5A059]" />
              <p className="text-xs font-medium">Crear manualmente</p>
              <p className="text-[10px] text-muted-foreground">Se envía enlace de verificación</p>
            </button>
          </div>

          {addMode === "invite" ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Correo electrónico</Label>
                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="mt-1" placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <Label className="text-xs">Nombre (opcional)</Label>
                <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="mt-1" placeholder="Nombre del miembro" />
              </div>
              <div>
                <Label className="text-xs">Rol</Label>
                <Select value={newRole} onValueChange={v => setNewRole(v as AppRole)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["ceo","admin","moderator"] as AppRole[]).map(r => (
                      <SelectItem key={r} value={r} disabled={!availableRoles.includes(r)}>
                        {ROLE_META[r].icon} {ROLE_META[r].label}
                        {!availableRoles.includes(r) && <span className="ml-2 text-[10px] opacity-60">(solo CEO)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isCeo && (
                  <p className="text-[10px] text-muted-foreground mt-1">Como administrador solo puedes invitar moderadores. Pide al CEO para asignar roles superiores.</p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                <p>Se registrará una invitación con el rol asignado. La persona deberá ingresar al login del CRM (<code>/login</code>), registrarse con este correo y crear su propia contraseña. Al hacerlo, recibirá automáticamente el rol.</p>
              </div>
              <Button className="w-full" disabled={!inviteEmail.trim() || saving} onClick={handleInviteByEmail}>
                {saving ? "Registrando..." : "Registrar invitación"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Correo electrónico</Label>
                <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="mt-1" placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <Label className="text-xs">Nombre (opcional)</Label>
                <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="mt-1" placeholder="Nombre del miembro" />
              </div>
              <div>
                <Label className="text-xs">Contraseña</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" placeholder="Mínimo 8 caracteres" />
                {newPassword && newPassword.length < 8 && <p className="text-[10px] text-destructive mt-1">La contraseña debe tener al menos 8 caracteres</p>}
              </div>
              <div>
                <Label className="text-xs">Rol</Label>
                <Select value={newRole} onValueChange={v => setNewRole(v as AppRole)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["ceo","admin","moderator"] as AppRole[]).map(r => (
                      <SelectItem key={r} value={r} disabled={!availableRoles.includes(r)}>
                        {ROLE_META[r].icon} {ROLE_META[r].label}
                        {!availableRoles.includes(r) && <span className="ml-2 text-[10px] opacity-60">(solo CEO)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isCeo && (
                  <p className="text-[10px] text-muted-foreground mt-1">Como administrador solo puedes crear moderadores.</p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                <p>El usuario deberá verificar su email antes de acceder. La contraseña asignada es temporal, se recomienda cambiarla en el primer acceso.</p>
              </div>
              <Button className="w-full" disabled={!newEmail.trim() || !newPassword.trim() || newPassword.length < 8 || saving} onClick={handleCreateManual}>
                {saving ? "Creando..." : "Crear usuario"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════ EDIT MEMBER DIALOG ═══════════════ */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5 text-[#C5A059]" />Editar miembro</DialogTitle>
            <DialogDescription>Modifique el nombre o rol de {selectedAdmin?.display_name ?? selectedAdmin?.user_id.slice(0, 12)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="mt-1" placeholder="Nombre del miembro" />
            </div>
            <div>
              <Label className="text-xs">Rol</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v as AppRole)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["ceo","admin","moderator"] as AppRole[]).map(r => (
                    <SelectItem key={r} value={r} disabled={!availableRoles.includes(r)}>
                      {ROLE_META[r].icon} {ROLE_META[r].label}
                      {!availableRoles.includes(r) && <span className="ml-2 text-[10px] opacity-60">(solo CEO)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditDialog(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleEditMember} disabled={saving} className="w-full sm:w-auto">{saving ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE DIALOG ═══════════════ */}
      <Dialog open={deleteDialog} onOpenChange={(v) => { if (!saving) setDeleteDialog(v); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {selectedAdmin ? `Eliminar ${ROLE_META[selectedAdmin.role].label}` : "Eliminar miembro"}
            </DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar a{" "}
              <strong>{selectedAdmin?.display_name ?? selectedAdmin?.email ?? selectedAdmin?.user_id.slice(0, 12)}</strong>
              {selectedAdmin && (
                <> como <strong>{ROLE_META[selectedAdmin.role].label}</strong></>
              )}?{" "}
              Perderá acceso al CRM inmediatamente. Esta acción queda registrada en el log de auditoría.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            Solo se elimina este rol del usuario. Si tiene otros roles asignados (por ejemplo, también es Moderador),
            esos no se ven afectados.
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" disabled={saving} onClick={() => setDeleteDialog(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button variant="destructive" disabled={saving} onClick={handleDeleteAdmin} className="w-full sm:w-auto">
              {saving ? "Eliminando..." : `Sí, eliminar ${selectedAdmin ? ROLE_META[selectedAdmin.role].label : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ OWN PROFILE DIALOG ═══════════════ */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5 text-[#C5A059]" />Mi perfil</DialogTitle>
            <DialogDescription>Personalice cómo aparece su nombre y foto en el equipo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 overflow-hidden flex items-center justify-center shrink-0">
                {profileAvatarPreview ? (
                  <img src={profileAvatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserCog className="w-8 h-8 text-[#C5A059]" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="avatar-upload" className="text-xs">Foto de perfil</Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  disabled={uploadingAvatar}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarUpload(f);
                  }}
                  className="text-xs"
                />
                {uploadingAvatar && <p className="text-[10px] text-muted-foreground">Subiendo...</p>}
              </div>
            </div>
            <div>
              <Label className="text-xs">Nombre a mostrar</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="mt-1"
                placeholder="Su nombre completo"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground border-t pt-3">
              <span>Email</span><span className="truncate ml-2">{user?.email}</span>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setProfileDialog(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSaveOwnProfile} disabled={savingProfile || uploadingAvatar} className="w-full sm:w-auto">
              {savingProfile ? "Guardando..." : "Guardar perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
