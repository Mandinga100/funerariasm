import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  contact_type: string;
  intent: string | null;
  source: string | null;
  urgency: string | null;
  status: string | null;
  created_at: string;
}

const urgencyColor: Record<string, string> = {
  inmediata: "bg-red-100 text-red-800",
  normal: "bg-blue-100 text-blue-800",
  previsión: "bg-green-100 text-green-800",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  contacted: { label: "Contactado", color: "bg-amber-100 text-amber-800" },
  closed: { label: "Cerrado", color: "bg-green-100 text-green-800" },
};

const statusFilters = [
  { value: "all", label: "Todos" },
  { value: "new", label: "🔵 Nuevos" },
  { value: "contacted", label: "🟡 Contactados" },
  { value: "closed", label: "🟢 Cerrados" },
];

const urgencyFilters = [
  { value: "all", label: "Todas" },
  { value: "inmediata", label: "🔴 Inmediata" },
  { value: "normal", label: "🔵 Normal" },
  { value: "previsión", label: "🟢 Previsión" },
];

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("contact_leads")
      .select("id, name, email, phone, contact_type, intent, source, urgency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLeads((data as Lead[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filterStatus !== "all" && (l.status ?? "new") !== filterStatus) return false;
      if (filterUrgency !== "all" && l.urgency !== filterUrgency) return false;
      return true;
    });
  }, [leads, filterStatus, filterUrgency]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    const { error } = await supabase
      .from("contact_leads")
      .update({ status: newStatus })
      .eq("id", leadId);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" });
      return;
    }

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    const cfg = statusConfig[newStatus];
    toast({ title: "Estado actualizado", description: cfg?.label ?? newStatus });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Contactos / Leads</h1>
        <Badge variant="outline">{filtered.length} de {leads.length} contactos</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Estado:</span>
          <div className="flex gap-1">
            {statusFilters.map(f => (
              <Button
                key={f.value}
                size="sm"
                variant={filterStatus === f.value ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setFilterStatus(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Urgencia:</span>
          <div className="flex gap-1">
            {urgencyFilters.map(f => (
              <Button
                key={f.value}
                size="sm"
                variant={filterUrgency === f.value ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setFilterUrgency(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No hay contactos con los filtros seleccionados.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Urgencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div>{lead.email ?? ""}</div>
                    <div className="text-muted-foreground">{lead.phone ?? ""}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{lead.contact_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {lead.urgency && (
                      <Badge className={urgencyColor[lead.urgency] ?? "bg-muted text-muted-foreground"} variant="secondary">
                        {lead.urgency}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={lead.status ?? "new"} onValueChange={(v) => handleStatusChange(lead.id, v)}>
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">🔵 Nuevo</SelectItem>
                        <SelectItem value="contacted">🟡 Contactado</SelectItem>
                        <SelectItem value="closed">🟢 Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.source ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString("es-CL")}
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
