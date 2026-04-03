import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Heart, Users, MessageSquare } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({ obituaries: 0, memorials: 0, leads: 0, condolences: 0 });

  useEffect(() => {
    const load = async () => {
      const [o, m, l, c] = await Promise.all([
        supabase.from("obituaries").select("id", { count: "exact", head: true }),
        supabase.from("memorials").select("id", { count: "exact", head: true }),
        supabase.from("contact_leads").select("id", { count: "exact", head: true }),
        supabase.from("condolences").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        obituaries: o.count ?? 0,
        memorials: m.count ?? 0,
        leads: l.count ?? 0,
        condolences: c.count ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Obituarios", value: stats.obituaries, icon: BookOpen, color: "text-blue-600" },
    { label: "Memoriales", value: stats.memorials, icon: Heart, color: "text-rose-600" },
    { label: "Leads", value: stats.leads, icon: Users, color: "text-amber-600" },
    { label: "Condolencias", value: stats.condolences, icon: MessageSquare, color: "text-green-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={cn("w-5 h-5", c.color)} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
