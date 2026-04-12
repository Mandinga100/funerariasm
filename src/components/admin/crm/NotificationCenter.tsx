import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  created_at: string;
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadNotifications();

    const channelName = `admin-notif-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications", filter: `user_id=eq.${user.id}` },
        () => loadNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("admin_notifications")
      .select("id, title, message, type, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
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
  const typeIcons: Record<string, string> = {
    new_lead: "🔵",
    overdue_lead: "🔴",
    payment: "💰",
    info: "ℹ️",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1 animate-pulse">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Notificaciones</span>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={markAllRead}>
              <Check className="w-3 h-3 mr-1" />Marcar leídas
            </Button>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">Sin notificaciones</p>
          ) : notifications.map(n => (
            <div
              key={n.id}
              className={cn("px-3 py-2 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors", !n.read && "bg-blue-50/50")}
              onClick={() => markRead(n.id)}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm">{typeIcons[n.type] ?? "ℹ️"}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs", !n.read && "font-semibold")}>{n.title}</p>
                  {n.message && <p className="text-[10px] text-muted-foreground truncate">{n.message}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
