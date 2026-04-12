import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Shield, Bell, Moon, Sun, BarChart3, Trash2, MoreVertical,
  Plus, UserCog, Lock, Eye, EyeOff, Settings, FileText, AlertTriangle,
  Check, X, Download
} from "lucide-react";

type AppRole = "ceo" | "admin" | "moderator";

interface AdminUser {
  id: string;
  user_id: string;
  role: AppRole;
  email?: string;
  display_name?: string;
}

const ROLE_META: Record<AppRole, { label: string; color: string; desc: string }> = {
  ceo: { label: "CEO", color: "bg-amber-100 text-amber-800 border-amber-300", desc: "Control total del sistema, gestión de administradores y configuración global" },
  admin: { label: "Administrador", color: "bg-blue-100 text-blue-800 border-blue-300", desc: "Acceso completo a leads, pagos, obituarios, memoriales y tracking" },
  moderator: { label: "Moderador", color: "bg-green-100 text-green-800 border-green-300", desc: "Gestión de contenido, condolencias y blog. Sin acceso a pagos ni configuración" },
};

export default function AdminSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  /* ── Admins State ── */
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("admin");
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

  /* ── Add admin ── */
  const handleAddAdmin = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);

    // Look up the user by email through profiles (we can't query auth.users directly)
    // The admin needs to provide the user_id or the email of an existing user
    const { data: profileData } = await supabase.from("profiles").select("user_id, display_name");
    // We can't directly query by email in profiles, so we'll need to use a workaround
    // For now, let's try to find by display_name matching email
    // In practice, the admin would need the user_id or email from the auth system

    toast({
      title: "Nota",
      description: "El usuario debe registrarse primero. Luego podrá ser asignado como administrador con su ID de usuario.",
    });

    setSaving(false);
    setAddDialog(false);
  };

  const handleAddByUserId = async (userId: string, role: AppRole) => {
    setSaving(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Administrador agregado", description: `Rol ${ROLE_META[role].label} asignado correctamente.` });
      loadAdmins();
    }
    setSaving(false);
    setAddDialog(false);
  };

  const handleUpdateRole = async (adminId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").update({ role }).eq("id", adminId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rol actualizado" });
      loadAdmins();
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    if (selectedAdmin.user_id === user?.id) {
      toast({ title: "Error", description: "No puede eliminar su propio acceso.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("user_roles").delete().eq("id", selectedAdmin.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Acceso removido" });
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
      toast({ title: "Contraseña actualizada", description: "Su contraseña ha sido cambiada exitosamente." });
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

  /* ── Export data ── */
  const exportLeads = async () => {
    const { data } = await supabase.from("contact_leads").select("*").order("created_at", { ascending: false }).limit(1000);
    if (!data?.length) { toast({ title: "Sin datos para exportar" }); return; }
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Leads exportados" });
  };

  const exportPayments = async () => {
    const { data } = await supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(1000);
    if (!data?.length) { toast({ title: "Sin datos para exportar" }); return; }
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pagos_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Pagos exportados" });
  };

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
          <TabsTrigger value="team" className="flex-1 min-w-[100px] text-xs sm:text-sm gap-1">
            <Users className="w-3.5 h-3.5 hidden sm:inline" />Equipo
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1 min-w-[100px] text-xs sm:text-sm gap-1">
            <Moon className="w-3.5 h-3.5 hidden sm:inline" />Apariencia
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 min-w-[100px] text-xs sm:text-sm gap-1">
            <Bell className="w-3.5 h-3.5 hidden sm:inline" />Notificaciones
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-1 min-w-[100px] text-xs sm:text-sm gap-1">
            <Shield className="w-3.5 h-3.5 hidden sm:inline" />Seguridad
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 min-w-[100px] text-xs sm:text-sm gap-1">
            <BarChart3 className="w-3.5 h-3.5 hidden sm:inline" />Informes
          </TabsTrigger>
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
                <Button size="sm" onClick={() => { setNewEmail(""); setNewRole("admin"); setAddDialog(true); }}>
                  <Plus className="w-4 h-4 mr-1" />Agregar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Roles legend */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                {(Object.entries(ROLE_META) as [AppRole, typeof ROLE_META[AppRole]][]).map(([key, meta]) => (
                  <div key={key} className="flex items-start gap-2 p-2 rounded-lg border bg-muted/30">
                    <Badge className={`${meta.color} text-[10px] shrink-0`} variant="secondary">{meta.label}</Badge>
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
                  {admins.map(admin => (
                    <div key={admin.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
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
                            {admin.user_id === user?.id && <span className="ml-1 text-[#C5A059]">(Tú)</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={admin.role}
                          onValueChange={(v) => handleUpdateRole(admin.id, v as AppRole)}
                          disabled={admin.user_id === user?.id}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ceo">👑 CEO</SelectItem>
                            <SelectItem value="admin">🔧 Administrador</SelectItem>
                            <SelectItem value="moderator">📝 Moderador</SelectItem>
                          </SelectContent>
                        </Select>
                        {admin.user_id !== user?.id && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => { setSelectedAdmin(admin); setDeleteDialog(true); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
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
                  <div>
                    <p className="text-sm font-medium">Nuevos leads</p>
                    <p className="text-xs text-muted-foreground">Notificación al recibir un nuevo contacto</p>
                  </div>
                  <Switch checked={notifLeads} onCheckedChange={setNotifLeads} />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Pagos pendientes</p>
                    <p className="text-xs text-muted-foreground">Alerta al recibir un nuevo pago por verificar</p>
                  </div>
                  <Switch checked={notifPayments} onCheckedChange={setNotifPayments} />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Sonido de notificación</p>
                    <p className="text-xs text-muted-foreground">Reproducir sonido al recibir alertas</p>
                  </div>
                  <Switch checked={notifSound} onCheckedChange={setNotifSound} />
                </div>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Notificaciones WhatsApp</p>
                      <p className="text-xs text-muted-foreground">Enviar alerta al WhatsApp cuando entre un nuevo lead urgente</p>
                    </div>
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium truncate ml-2">{user?.email}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID de usuario</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate ml-2">{user?.id?.slice(0, 16)}...</code>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Último acceso</span>
                <span className="text-xs">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("es-CL") : "—"}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════ REPORTS TAB ═══════════════ */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Exportar Informes</CardTitle>
              <CardDescription>Descargue datos del sistema en formato CSV para análisis externo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={exportLeads} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Exportar Leads</p>
                    <p className="text-xs text-muted-foreground">Todos los contactos y su clasificación</p>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                </button>
                <button onClick={exportPayments} className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Exportar Pagos</p>
                    <p className="text-xs text-muted-foreground">Historial completo de transacciones</p>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Auditoría del Sistema</CardTitle>
              <CardDescription>Información general sobre la actividad del CRM</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-[#C5A059]" />Los registros de actividad se almacenan automáticamente en el sistema.</p>
                <p className="text-xs">Cada cambio en leads, pagos y tracking queda registrado con fecha, hora y usuario responsable. Use las exportaciones para generar informes detallados.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══════════════ ADD ADMIN DIALOG ═══════════════ */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Administrador</DialogTitle>
            <DialogDescription>Ingrese el ID de usuario (UUID) de la persona que desea agregar. El usuario debe haberse registrado previamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">ID de Usuario (UUID)</Label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} className="mt-1 font-mono text-xs" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <p className="text-[11px] text-muted-foreground mt-1">Puede encontrar el ID en la sección de seguridad de cada usuario.</p>
            </div>
            <div>
              <Label className="text-xs">Rol</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v as AppRole)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ceo">👑 CEO</SelectItem>
                  <SelectItem value="admin">🔧 Administrador</SelectItem>
                  <SelectItem value="moderator">📝 Moderador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!newEmail.trim() || saving} onClick={() => handleAddByUserId(newEmail.trim(), newRole)}>
              {saving ? "Agregando..." : "Agregar Administrador"}
            </Button>
          </div>
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
