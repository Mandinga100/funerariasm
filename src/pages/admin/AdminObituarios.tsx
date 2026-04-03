import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Obituary = Tables<"obituaries">;

export default function AdminObituarios() {
  const [items, setItems] = useState<Obituary[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("obituaries").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublished = async (id: string, current: boolean) => {
    const { error } = await supabase.from("obituaries").update({
      published: !current,
      published_at: !current ? new Date().toISOString() : null
    }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: !current ? "Publicado" : "Despublicado" });
      load();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestión de Obituarios</h1>
        <Badge variant="outline">{items.length} total</Badge>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No hay obituarios registrados.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Fallecimiento</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.full_name}</TableCell>
                  <TableCell>{item.city ?? "—"}</TableCell>
                  <TableCell>{item.death_date}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.published}
                      onCheckedChange={() => togglePublished(item.id, item.published)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/obituarios/${item.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
