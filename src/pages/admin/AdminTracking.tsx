import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy } from "lucide-react";

const STATUSES = ["recibido", "en_preparación", "velatorio", "ceremonia", "traslado", "finalizado"];

interface TrackingItem {
  id: string;
  family_code: string;
  family_name: string;
  family_email: string | null;
  family_phone: string | null;
  obituary_id: string | null;
  memorial_id: string | null;
  status: string;
  notes: string | null;
  assigned_at: string;
  updated_at: string;
}

export default function AdminTracking() {
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ family_name: "", family_email: "", family_phone: "", notes: "" });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("family_tracking").select("*").order("assigned_at", { ascending: false });
    setItems((data as TrackingItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("family_tracking").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  };

  const createTracking = async () => {
    const { error } = await supabase.from("family_tracking").insert({
      family_name: form.family_name,
      family_email: form.family_email || null,
      family_phone: form.family_phone || null,
      notes: form.notes || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tracking creado" });
      setForm({ family_name: "", family_email: "", family_phone: "", notes: "" });
      setDialogOpen(false);
      load();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/seguimiento?code=${code}`);
    toast({ title: "Enlace copiado" });
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      recibido: "bg-blue-100 text-blue-800",
      en_preparación: "bg-yellow-100 text-yellow-800",
      velatorio: "bg-purple-100 text-purple-800",
      ceremonia: "bg-indigo-100 text-indigo-800",
      traslado: "bg-orange-100 text-orange-800",
      finalizado: "bg-green-100 text-green-800",
    };
    return map[s] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tracking Familiar</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nuevo Tracking</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Tracking Familiar</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nombre de la familia</Label><Input value={form.family_name} onChange={e => setForm(p => ({ ...p, family_name: e.target.value }))} required /></div>
              <div><Label>Email</Label><Input type="email" value={form.family_email} onChange={e => setForm(p => ({ ...p, family_email: e.target.value }))} /></div>
              <div><Label>Teléfono</Label><Input value={form.family_phone} onChange={e => setForm(p => ({ ...p, family_phone: e.target.value }))} /></div>
              <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <Button onClick={createTracking} className="w-full" disabled={!form.family_name}>Crear</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No hay trackings creados.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Familia</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.family_name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{item.family_code}</code>
                  </TableCell>
                  <TableCell>
                    <Select value={item.status} onValueChange={v => updateStatus(item.id, v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>
                            <Badge className={statusColor(s)} variant="secondary">{s.replace("_", " ")}</Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.family_email ?? item.family_phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => copyCode(item.family_code)} title="Copiar enlace">
                      <Copy className="w-4 h-4" />
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
