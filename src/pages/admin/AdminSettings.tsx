import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";
import { useAuth } from "@/hooks/useAuth";
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
import { useToast } from "@/hooks/use-toast";
import {
  Users, Shield, Bell, Moon, Sun, BarChart3, Trash2,
  Plus, UserCog, Lock, Eye, EyeOff, Settings, FileText, AlertTriangle,
  Check, X, Download, Zap, Bot, Globe, Key, Mail, UserPlus, Pencil,
  Link2, Webhook, Brain, CloudCog, ScrollText, Search, ChevronLeft, ChevronRight,
  Filter
} from "lucide-react";

type AppRole = "ceo" | "admin" | "moderator";

interface AdminUser {
  id: string;
  user_id: string;
  role: AppRole;
  email?: string;
  display_name?: string;
}

const ROLE_META: Record<AppRole, { label: string; color: string; desc: string; icon: string }> = {
  ceo: { label: "CEO", color: "bg-amber-100 text-amber-800 border-amber-300", desc: "Control total del sistema, gestión de administradores y configuración global", icon: "👑" },
  admin: { label: "Administrador", color: "bg-blue-100 text-blue-800 border-blue-300", desc: "Acceso completo a leads, pagos, obituarios, memoriales y tracking", icon: "🔧" },
  moderator: { label: "Moderador", color: "bg-green-100 text-green-800 border-green-300", desc: "Gestión de contenido, condolencias y blog. Sin acceso a pagos ni configuración", icon: "📝" },
};

const CEO_EMAIL = "mandinga_atim@hotmail.com";

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isCeo = user?.email === CEO_EMAIL;

  /* ── Admins State ── */
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [addMode, setAddMode] = useState<"manual" | "invite">("manual");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("admin");
  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);

  /* ── Preferences State ── */
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("crm_theme") as "light" | "dark") ?? "light";
  });
  const [notifLeads, setNotifLeads] = useState(() => localStorage.getItem("crm_notif_leads") !== "false");
  const [notifPayments, setNotifPayments] = useState(() => localStorage.getItem("crm_notif_payments") !== "false");
  const [notifSound, setNotifSound] = useState(() => localStorage.getItem("admin_notification_sound") !== "false");
  const [wspNotif, setWspNotif] = useState(() => localStorage.getItem("crm_wsp_notif") === "true");
  const [wspNumber, setWspNumber] = useState(() => localStorage.getItem("crm_wsp_number") ?? "+56 9 6433 3760");

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

    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
    const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p.display_name]));

    setAdmins(roles.map(r => ({
      id: r.id,
      user_id: r.user_id,
      role: r.role as AppRole,
      display_name: profileMap.get(r.user_id) ?? undefined,
      email: r.user_id === user?.id ? user.email ?? undefined : undefined,
    })));
    setLoadingAdmins(false);
  };

  useEffect(() => { loadAdmins(); }, []);

  /* ── Theme effect ── */
  useEffect(() => {
    localStorage.setItem("crm_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

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

  /* ── Invite via email (creates user with temp password) ── */
  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) return;
    if (!isCeo && newRole === "ceo") {
      toast({ title: "Acceso denegado", description: "Solo el CEO puede asignar el rol de CEO.", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Sign up the user with a temporary password
    const tempPassword = `Temp_${crypto.randomUUID().slice(0, 12)}!`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: inviteEmail.trim(),
      password: tempPassword,
      options: { data: { display_name: newDisplayName || inviteEmail.split("@")[0] } }
    });

    if (signUpError || !signUpData.user) {
      toast({ title: "Error al crear usuario", description: signUpError?.message ?? "No se pudo crear el usuario.", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Assign role
    const { error: roleError } = await supabase.from("user_roles").insert({ user_id: signUpData.user.id, role: newRole });
    if (roleError) {
      toast({ title: "Usuario creado pero error de rol", description: roleError.message, variant: "destructive" });
    } else {
      toast({
        title: "Invitación enviada",
        description: `Se envió un correo de verificación a ${inviteEmail}. El usuario deberá verificar su email para acceder.`,
      });
      loadAdmins();
    }
    setSaving(false);
    setAddDialog(false);
    resetAddForm();
  };

  /* ── Create manual user ── */
  const handleCreateManual = async () => {
    if (!newEmail.trim() || !newPassword.trim()) return;
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 8 caracteres.", variant: "destructive" });
      return;
    }
    if (!isCeo && newRole === "ceo") {
      toast({ title: "Acceso denegado", description: "Solo el CEO puede asignar el rol de CEO.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newEmail.trim(),
      password: newPassword,
      options: { data: { display_name: newDisplayName || newEmail.split("@")[0] } }
    });

    if (signUpError || !signUpData.user) {
      toast({ title: "Error al crear usuario", description: signUpError?.message ?? "No se pudo crear el usuario.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error: roleError } = await supabase.from("user_roles").insert({ user_id: signUpData.user.id, role: newRole });
    if (roleError) {
      toast({ title: "Usuario creado pero error de rol", description: roleError.message, variant: "destructive" });
    } else {
      toast({
        title: "Usuario creado",
        description: `${newEmail} creado como ${ROLE_META[newRole].label}. Deberá verificar su email.`,
      });
      loadAdmins();
    }
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

  /* ── Delete admin ── */
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
    const { error } = await supabase.from("user_roles").delete().eq("id", selectedAdmin.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Acceso removido" });
      logAudit({ action: "remove_member", module: "equipo", description: `Removió acceso de ${selectedAdmin.display_name ?? selectedAdmin.user_id.slice(0, 12)}`, entity_type: "user_role", entity_id: selectedAdmin.id, old_data: { role: selectedAdmin.role } });
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

  /* ── Save notification prefs ── */
  const saveNotifPrefs = () => {
    localStorage.setItem("crm_notif_leads", String(notifLeads));
    localStorage.setItem("crm_notif_payments", String(notifPayments));
    localStorage.setItem("admin_notification_sound", String(notifSound));
    localStorage.setItem("crm_wsp_notif", String(wspNotif));
    localStorage.setItem("crm_wsp_number", wspNumber);
    toast({ title: "Preferencias guardadas" });
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
  const availableRoles: AppRole[] = isCeo ? ["ceo", "admin", "moderator"] : ["admin", "moderator"];

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
          <TabsTrigger value="audit" className="flex-1 min-w-[80px] text-xs sm:text-sm gap-1">
            <ScrollText className="w-3.5 h-3.5 hidden sm:inline" />Auditoría
          </TabsTrigger>
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
                    const canManage = isCeo && admin.user_id !== user?.id;
                    const canChangeRole = isCeo;
                    return (
                      <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#C5A059]/10 flex items-center justify-center shrink-0">
                            <UserCog className="w-4 h-4 text-[#C5A059]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {admin.display_name ?? admin.email ?? admin.user_id.slice(0, 8) + "..."}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {admin.email ?? `ID: ${admin.user_id.slice(0, 12)}...`}
                              {admin.user_id === user?.id && <span className="ml-1 text-[#C5A059] font-medium">(Tú)</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-12 sm:ml-0">
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
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
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
              <CardDescription>Seleccione el modo visual del CRM</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${theme === "light" ? "border-[#C5A059] ring-2 ring-[#C5A059]/20 bg-[#C5A059]/5" : "border-muted hover:border-muted-foreground/30"}`}
                >
                  <Sun className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium">Claro</p>
                  <p className="text-[11px] text-muted-foreground">Interfaz luminosa</p>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${theme === "dark" ? "border-[#C5A059] ring-2 ring-[#C5A059]/20 bg-[#C5A059]/5" : "border-muted hover:border-muted-foreground/30"}`}
                >
                  <Moon className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
                  <p className="text-sm font-medium">Oscuro</p>
                  <p className="text-[11px] text-muted-foreground">Reduce fatiga visual</p>
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
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-medium">Sonido de notificación</p><p className="text-xs text-muted-foreground">Reproducir sonido al recibir alertas</p></div>
                  <Switch checked={notifSound} onCheckedChange={setNotifSound} />
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
                <p className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />Las contraseñas coinciden</p>
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
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nivel de acceso</span><Badge className={isCeo ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"} variant="secondary">{isCeo ? "👑 CEO" : "🔧 Admin"}</Badge></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2"><Shield className="w-4 h-4 text-[#C5A059]" />Políticas de Seguridad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /><span>Contraseñas mínimas de 8 caracteres</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /><span>Verificación de email obligatoria para nuevos usuarios</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /><span>Solo el CEO puede asignar roles de CEO y Admin</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /><span>Row Level Security (RLS) en todas las tablas</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /><span>Sesiones con token JWT y refresco automático</span></div>
              <div className="flex items-start gap-2"><Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /><span>Registro de actividad en leads y pagos</span></div>
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
                  { fn: () => exportData("contact_leads", "leads"), icon: Users, color: "blue", title: "Exportar Leads", desc: "Contactos y clasificación" },
                  { fn: () => exportData("payment_transactions", "pagos"), icon: FileText, color: "green", title: "Exportar Pagos", desc: "Historial de transacciones" },
                  { fn: () => exportData("family_tracking", "tracking"), icon: Globe, color: "purple", title: "Exportar Tracking", desc: "Seguimiento de servicios" },
                  { fn: () => exportData("obituaries", "obituarios"), icon: FileText, color: "gray", title: "Exportar Obituarios", desc: "Registros de obituarios" },
                ].map((item, idx) => (
                  <button key={idx} onClick={item.fn} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                    <div className={`w-10 h-10 rounded-lg bg-${item.color}-50 flex items-center justify-center shrink-0`}>
                      <item.icon className={`w-5 h-5 text-${item.color}-600`} />
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
                      add_member: "bg-green-100 text-green-800",
                      remove_member: "bg-red-100 text-red-800",
                      update_role: "bg-blue-100 text-blue-800",
                      change_password: "bg-amber-100 text-amber-800",
                      update_lead: "bg-purple-100 text-purple-800",
                      delete: "bg-red-100 text-red-800",
                      create: "bg-green-100 text-green-800",
                      update: "bg-blue-100 text-blue-800",
                      export: "bg-gray-100 text-gray-800",
                      login: "bg-emerald-100 text-emerald-800",
                    };
                    const badgeClass = actionColors[log.action] ?? "bg-muted text-muted-foreground";
                    const date = new Date(log.created_at);
                    return (
                      <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                            {date.toLocaleDateString("es-CL")} {date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <Badge className={`${badgeClass} text-[10px] px-1.5 py-0`} variant="secondary">
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{log.description}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {log.user_email ?? "Sistema"} · {log.user_role ?? ""} · {log.module}
                            {log.entity_type && ` · ${log.entity_type}`}
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
              onClick={() => setAddMode("invite")}
              className={`p-3 rounded-lg border-2 text-center transition-all ${addMode === "invite" ? "border-[#C5A059] bg-[#C5A059]/5" : "border-muted hover:border-muted-foreground/30"}`}
            >
              <Mail className="w-5 h-5 mx-auto mb-1 text-[#C5A059]" />
              <p className="text-xs font-medium">Invitar por correo</p>
              <p className="text-[10px] text-muted-foreground">Se envía enlace de verificación</p>
            </button>
            <button
              onClick={() => setAddMode("manual")}
              className={`p-3 rounded-lg border-2 text-center transition-all ${addMode === "manual" ? "border-[#C5A059] bg-[#C5A059]/5" : "border-muted hover:border-muted-foreground/30"}`}
            >
              <Key className="w-5 h-5 mx-auto mb-1 text-[#C5A059]" />
              <p className="text-xs font-medium">Crear manualmente</p>
              <p className="text-[10px] text-muted-foreground">Asignar correo y contraseña</p>
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
                    {availableRoles.map(r => (
                      <SelectItem key={r} value={r}>{ROLE_META[r].icon} {ROLE_META[r].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                <p>Se enviará un correo de verificación. El usuario deberá confirmar su email antes de poder acceder al CRM. El token es temporal y expira automáticamente.</p>
              </div>
              <Button className="w-full" disabled={!inviteEmail.trim() || saving} onClick={handleInviteByEmail}>
                {saving ? "Enviando..." : "Enviar invitación"}
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
                    {availableRoles.map(r => (
                      <SelectItem key={r} value={r}>{ROLE_META[r].icon} {ROLE_META[r].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
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
                  {availableRoles.map(r => (
                    <SelectItem key={r} value={r}>{ROLE_META[r].icon} {ROLE_META[r].label}</SelectItem>
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
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />Remover Acceso</DialogTitle>
            <DialogDescription>
              ¿Está seguro de remover el acceso de <strong>{selectedAdmin?.display_name ?? selectedAdmin?.user_id.slice(0, 12)}</strong>? Perderá acceso al CRM inmediatamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAdmin} className="w-full sm:w-auto">Remover Acceso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
