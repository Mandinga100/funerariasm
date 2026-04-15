import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, BookOpen, Heart, Users, LogOut, FileText, MessageSquare, CreditCard, Menu, Settings, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import NotificationCenter from "@/components/admin/crm/NotificationCenter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/use-notification-sound";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/leads", label: "Leads", icon: MessageSquare, end: false, badgeKey: "leads" as const },
  { to: "/admin/casos", label: "Casos y Servicios", icon: Briefcase, end: false },
  { to: "/admin/obituarios", label: "Obituarios", icon: BookOpen, end: false },
  { to: "/admin/legados-eternos", label: "Legados", icon: Heart, end: false },
  { to: "/admin/blog", label: "Blog", icon: FileText, end: false },
  { to: "/admin/tracking", label: "Tracking", icon: Users, end: false },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard, end: false, badgeKey: "pagos" as const },
  { to: "/admin/configuracion", label: "Configuración", icon: Settings, end: false },
];

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { playUrgentAlert } = useNotificationSound();
  const [pendingPayments, setPendingPayments] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const SidebarNav = () => (
    <>
      <nav className="flex-1 p-1.5 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const count = getBadgeCount("badgeKey" in item ? item.badgeKey : undefined);
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
    <div className="min-h-screen flex bg-muted/20 dark">
      <aside className="hidden md:flex w-64 border-r bg-background flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-semibold text-lg">CRM Funeraria</h2>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
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
              <div className="p-4 border-b">
                <h2 className="font-semibold text-base">CRM Funeraria</h2>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <SidebarNav />
            </SheetContent>
          </Sheet>
          <h1 className="font-semibold text-sm truncate">CRM Funeraria</h1>
          {isMobile && <NotificationCenter />}
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

