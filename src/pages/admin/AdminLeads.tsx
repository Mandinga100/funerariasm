import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contactos / Leads</h1>
        <Badge variant="outline">{leads.length} contactos</Badge>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : leads.length === 0 ? (
        <p className="text-muted-foreground">No hay contactos registrados.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Urgencia</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map(lead => (
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
