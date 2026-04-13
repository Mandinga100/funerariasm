import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  reference_type: string | null;
  read: boolean;
  created_at: string;
}

const isUrgent = (n: Notification) =>
  n.type === "urgent" || n.reference_type === "urgent_lead";

type FilterKey = "all" | "urgent" | "leads" | "payments" | "reports";

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: "all", label: "Todas", icon: "📋" },
  { key: "urgent", label: "Urgentes", icon: "🚨" },
  { key: "leads", label: "Leads", icon: "🔵" },
  { key: "payments", label: "Pagos", icon: "💰" },
  { key: "reports", label: "Reportes", icon: "📊" },
];

const matchesFilter = (n: Notification, filter: FilterKey): boolean => {
  if (filter === "all") return true;
  if (filter === "urgent") return isUrgent(n);
  if (filter === "leads") return ["new_lead", "overdue_lead"].includes(n.type) || n.reference_type === "lead";
  if (filter === "payments") return n.type === "payment" || n.reference_type === "payment";
  if (filter === "reports") return n.type === "warning" || n.type === "info" || n.reference_type === "kpi_report";
  return true;
};

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const instanceIdRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channel = supabase
      .channel(`admin-notif-${user.id}-${instanceIdRef.current}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications", filter: `user_id=eq.${user.id}` },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("admin_notifications")
      .select("id, title, message, type, reference_type, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data as Notification[]) ?? []);
  };

  const markRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ read: true, read_at: new Date().toISOString() }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (unread.length === 0) return;
    for (const id of unread) {
      await supabase.from("admin_notifications").update({ read: true, read_at: new Date().toISOString() }).eq("id", id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentUnread = notifications.filter(n => !n.read && isUrgent(n)).length;
  const filtered = notifications.filter(n => matchesFilter(n, activeFilter));

  const typeIcons: Record<string, string> = {
    new_lead: "🔵",
    overdue_lead: "🔴",
    payment: "💰",
    info: "ℹ️",
    warning: "⚠️",
    urgent: "🚨",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={cn("w-5 h-5", urgentUnread > 0 && "text-red-500")} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1",
                urgentUnread > 0 ? "bg-red-600 animate-pulse" : "animate-pulse"
              )}
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notificaciones</span>
            {urgentUnread > 0 && (
              <Badge variant="destructive" className="h-5 text-[10px] px-1.5 gap-1">
                <AlertTriangle className="w-3 h-3" />
                {urgentUnread} urgente{urgentUnread > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" />Marcar leídas
            </Button>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">Sin notificaciones</p>
          ) : notifications.map(n => {
            const urgent = isUrgent(n);
            return (
              <div
                key={n.id}
                className={cn(
                  "px-3 py-2.5 border-b last:border-b-0 cursor-pointer transition-colors",
                  urgent && !n.read && "bg-red-50 border-l-[3px] border-l-red-500 hover:bg-red-100/70",
                  urgent && n.read && "border-l-[3px] border-l-red-200 hover:bg-muted/50",
                  !urgent && !n.read && "bg-blue-50/50 hover:bg-blue-50/80",
                  !urgent && n.read && "hover:bg-muted/50"
                )}
                onClick={() => markRead(n.id)}
              >
                <div className="flex items-start gap-2">
                  <span className={cn("text-sm mt-0.5", urgent && "animate-pulse")}>
                    {urgent ? "🚨" : (typeIcons[n.type] ?? "ℹ️")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn(
                        "text-xs leading-tight",
                        !n.read && "font-semibold",
                        urgent && !n.read && "text-red-700",
                        urgent && n.read && "text-red-600/70"
                      )}>
                        {n.title}
                      </p>
                      {urgent && !n.read && (
                        <Badge variant="destructive" className="h-4 text-[9px] px-1 shrink-0">
                          URGENTE
                        </Badge>
                      )}
                    </div>
                    {n.message && (
                      <p className={cn(
                        "text-[11px] mt-0.5 line-clamp-2",
                        urgent ? "text-red-600/60" : "text-muted-foreground"
                      )}>
                        {n.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0",
                      urgent ? "bg-red-500 animate-pulse" : "bg-blue-500"
                    )} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
