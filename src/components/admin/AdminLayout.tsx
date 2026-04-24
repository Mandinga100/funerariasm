import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, BookOpen, Heart, Users, LogOut, FileText, MessageSquare, CreditCard, Menu, Settings, Briefcase, Mail, MapPin, Trophy, Brain, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import NotificationCenter from "@/components/admin/crm/NotificationCenter";
import RoleBadge from "@/components/admin/RoleBadge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { useLeadRealtimeAlerts } from "@/hooks/use-lead-notifications";
import { useModuleRealtimeAlerts } from "@/hooks/use-module-realtime-alerts";
import { useAdminTheme, bootstrapAdminTheme } from "@/hooks/use-admin-theme";
import { signAvatarUrl } from "@/lib/avatar-url";

// Aplica el tema almacenado antes del primer render para evitar flash visual.
bootstrapAdminTheme();

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end: boolean;
  badgeKey?: "leads" | "pagos";
  /** Solo visible para CEO */
  ceoOnly?: boolean;
};

const navItems: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/leads", label: "Leads", icon: MessageSquare, end: false, badgeKey: "leads" },
  { to: "/admin/casos", label: "Casos y Servicios", icon: Briefcase, end: false },
  { to: "/admin/agenda", label: "Agenda", icon: Calendar, end: false },
  { to: "/admin/obituarios", label: "Obituarios", icon: BookOpen, end: false, ceoOnly: true },
  { to: "/admin/memoriales", label: "Legados", icon: Heart, end: false, ceoOnly: true },
  { to: "/admin/blog", label: "Blog", icon: FileText, end: false, ceoOnly: true },
  { to: "/admin/suscriptores", label: "Suscriptores", icon: Mail, end: false, ceoOnly: true },
  { to: "/admin/tracking", label: "Tracking", icon: Users, end: false },
  { to: "/admin/analytics-comunas", label: "Analítica Comunas", icon: MapPin, end: false, ceoOnly: true },
  { to: "/admin/roi-comunas", label: "ROI por Comuna", icon: Trophy, end: false, ceoOnly: true },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard, end: false, badgeKey: "pagos" },
  { to: "/admin/ajustes/ia", label: "Ajustes IA", icon: Brain, end: false, ceoOnly: true },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings, end: false },
];

export default function AdminLayout() {
  const { signOut, user, isCeo, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { playUrgentAlert } = useNotificationSound();
  // Inicializa el tema una vez montado el layout (auto-aplica light/dark/system).
  useAdminTheme();
  // Suscripción global a leads nuevos: alerta sonora + toast con WhatsApp Business.
  useLeadRealtimeAlerts({ enabled: !!user?.id });
  // Suscripción global a casos, agenda, suscriptores, tracking y pagos.
  useModuleRealtimeAlerts({ enabled: !!user?.id });
  const [pendingPayments, setPendingPayments] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [signedAvatar, setSignedAvatar] = useState<string | null>(null);

  // Cargar perfil para mostrar nombre + avatar en sidebar
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setProfile(data ?? null);
    })();
    // Escuchar cambios en el propio perfil para reflejar edición desde Equipo
    const ch = supabase
      .channel(`own-profile-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const p = payload.new as { display_name: string | null; avatar_url: string | null };
          setProfile({ display_name: p.display_name, avatar_url: p.avatar_url });
        })
      .subscribe();
    return () => { cancelled = true; void supabase.removeChannel(ch); };
  }, [user?.id]);

  // Firmar URL del avatar (bucket privado) cada vez que cambia el path almacenado.
  // Re-firma cada 50 min para evitar expiración.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const refresh = async () => {
      const url = await signAvatarUrl(profile?.avatar_url, 3600);
      if (!cancelled) setSignedAvatar(url);
    };
    if (profile?.avatar_url) {
      void refresh();
      timer = setInterval(refresh, 50 * 60 * 1000);
    } else {
      setSignedAvatar(null);
    }
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, [profile?.avatar_url]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Real-time urgent lead alerts
  useEffect(() => {
    if (!user?.id) return;

    const urgentChannel = supabase
      .channel(`urgent-alerts-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as any;
          if (notification.type === "urgent" || notification.reference_type === "urgent_lead") {
            toast({
              title: notification.title,
              description: notification.message?.substring(0, 120),
              variant: "destructive",
              duration: 15000,
            });

            playUrgentAlert();

            // Browser push notification (works even when tab is not focused)
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(notification.title || "🚨 Alerta Urgente", {
                  body: notification.message?.substring(0, 200) || "Nuevo lead con urgencia inmediata",
                  icon: "/favicon.ico",
                  tag: `urgent-${notification.id}`,
                  requireInteraction: true,
                });
              } catch {}
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(urgentChannel);
    };
  }, [user?.id, toast, playUrgentAlert]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from("payment_transactions")
        .select("id", { count: "exact", head: true })
        .in("status", ["initiated", "pending_verification"]);
      setPendingPayments(count ?? 0);
    };

    const fetchLeads = async () => {
      const { count } = await supabase
        .from("contact_leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      setNewLeads(count ?? 0);
    };

    fetchPending();
    fetchLeads();

    const suffix = Date.now();
    const paymentsChannel = supabase
      .channel(`sidebar-payments-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions" }, () => fetchPending())
      .subscribe();

    const leadsChannel = supabase
      .channel(`sidebar-leads-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_leads" }, () => fetchLeads())
      .subscribe();

    return () => {
      void supabase.removeChannel(paymentsChannel);
      void supabase.removeChannel(leadsChannel);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getBadgeCount = (key?: string) => {
    if (key === "pagos") return pendingPayments;
    if (key === "leads") return newLeads;
    return 0;
  };

  const visibleNavItems = navItems.filter(i => isCeo || !i.ceoOnly);

  const SidebarHeader = () => {
    const initials = (profile?.display_name ?? user?.email ?? "?").slice(0, 2).toUpperCase();
    return (
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 overflow-hidden shrink-0 flex items-center justify-center">
          {signedAvatar ? (
            <img src={signedAvatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-semibold text-[#C5A059]">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="font-semibold text-sm leading-tight truncate">
              {profile?.display_name ?? "CRM Funeraria"}
            </h2>
            <RoleBadge isCeo={isCeo} isAdmin={isAdmin} compact />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
    );
  };

  const SidebarNav = () => (
    <>
      <nav className="flex-1 p-1.5 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map(item => {
          const count = getBadgeCount(item.badgeKey);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                  isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5">
                  {count}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-2 border-t">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="hidden md:flex w-64 border-r bg-background flex-col">
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <SidebarHeader />
          {!isMobile && <NotificationCenter />}
        </div>
        <SidebarNav />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b bg-background px-3 py-2.5 sticky top-0 z-40">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0 flex flex-col">
              <div className="p-3 border-b">
                <SidebarHeader />
              </div>
              <SidebarNav />
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-sm truncate">CRM Funeraria</h1>
          <div className="flex items-center gap-2">
            <RoleBadge isCeo={isCeo} isAdmin={isAdmin} compact />
            {isMobile && <NotificationCenter />}
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

