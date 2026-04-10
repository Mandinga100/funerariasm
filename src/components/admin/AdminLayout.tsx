import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BookOpen, Heart, Users, LogOut, FileText, MessageSquare, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/obituarios", label: "Obituarios", icon: BookOpen, end: false },
  { to: "/admin/memoriales", label: "Memoriales", icon: Heart, end: false },
  { to: "/admin/blog", label: "Blog", icon: FileText, end: false },
  { to: "/admin/tracking", label: "Tracking Familiar", icon: Users, end: false },
  { to: "/admin/leads", label: "Contactos", icon: MessageSquare, end: false, badgeKey: "leads" as const },
  { to: "/admin/pagos", label: "Pagos", icon: CreditCard, end: false, badgeKey: "pagos" as const },
];

export default function AdminLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [pendingPayments, setPendingPayments] = useState(0);
  const [newLeads, setNewLeads] = useState(0);

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

    const paymentsChannel = supabase
      .channel("sidebar-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_transactions" }, () => fetchPending())
      .subscribe();

    const leadsChannel = supabase
      .channel("sidebar-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_leads" }, () => fetchLeads())
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(leadsChannel);
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

  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="w-64 border-r bg-background flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Panel Admin</h2>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => {
            const count = getBadgeCount("badgeKey" in item ? item.badgeKey : undefined);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
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
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}