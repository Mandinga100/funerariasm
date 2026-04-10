import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Eye, Download, DollarSign, Clock, AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  transaction_ref: string;
  full_name: string;
  rut: string;
  email: string;
  phone: string;
  payment_type: string;
  payment_subtype: string | null;
  amount: number;
  currency: string;
  status: string;
  plan_name: string | null;
  service_description: string | null;
  case_reference: string | null;
  donor_display_name: string | null;
  donor_message: string | null;
  is_anonymous: boolean | null;
  proof_url: string | null;
  proof_filename: string | null;
  fraud_flags: string[] | null;
  honeypot_triggered: boolean | null;
  notes: string | null;
  created_at: string;
  form_submitted_at: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  initiated: { label: "Iniciado", className: "bg-gray-100 text-gray-800" },
  transfer_reported: { label: "Informado", className: "bg-blue-100 text-blue-800" },
  proof_uploaded: { label: "Con comprobante", className: "bg-indigo-100 text-indigo-800" },
  pending_review: { label: "En revisión", className: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmado", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazado", className: "bg-red-100 text-red-800" },
  suspicious: { label: "Sospechoso", className: "bg-orange-100 text-orange-800" },
};

const typeLabels: Record<string, string> = {
  servicio: "Servicio Funerario",
  planificacion: "Planificación Anticipada",
  donacion: "Donación Legado Eterno",
};

export default function AdminPagos() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("payment_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setTransactions((data as Transaction[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = transactions.filter(tx => {
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    if (filterType !== "all" && tx.payment_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!tx.full_name.toLowerCase().includes(q) && !tx.transaction_ref.toLowerCase().includes(q) && !tx.rut.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("payment_transactions")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setUpdating(false);
    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    } else {
      toast({ title: "Actualizado", description: `Transacción marcada como ${status}.` });
      setSelected(null);
      load();
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => ["transfer_reported", "proof_uploaded", "pending_review"].includes(t.status)).length,
    confirmed: transactions.filter(t => t.status === "confirmed").length,
    suspicious: transactions.filter(t => t.status === "suspicious" || (t.fraud_flags && t.fraud_flags.length > 0)).length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transacciones de Pago</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, ref o RUT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-48">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(typeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(filterStatus !== "all" || filterType !== "all" || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterType("all"); setSearchQuery(""); }}>
            <X className="w-4 h-4 mr-1" /> Limpiar
          </Button>
        )}
        <Badge variant="outline" className="ml-auto self-center">{filtered.length} de {transactions.length}</Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: stats.total, icon: DollarSign, color: "text-primary" },
          { label: "Pendientes", value: stats.pending, icon: Clock, color: "text-yellow-600" },
          { label: "Confirmados", value: stats.confirmed, icon: CheckCircle2, color: "text-green-600" },
          { label: "Sospechosos", value: stats.suspicious, icon: AlertTriangle, color: "text-orange-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={cn("w-5 h-5", s.color)} />
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No hay transacciones que coincidan con los filtros.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(tx => {
                const sc = statusConfig[tx.status] ?? { label: tx.status, className: "bg-muted" };
                const hasFraud = tx.fraud_flags && tx.fraud_flags.length > 0;
                return (
                  <TableRow key={tx.id} className={hasFraud ? "bg-orange-50/50" : ""}>
                    <TableCell className="font-mono text-xs">{tx.transaction_ref}</TableCell>
                    <TableCell className="font-medium">
                      {tx.full_name}
                      {hasFraud && <AlertTriangle className="inline ml-1 w-3 h-3 text-orange-500" />}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{typeLabels[tx.payment_type] ?? tx.payment_type}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{fmt(tx.amount)}</TableCell>
                    <TableCell>
                      <Badge className={sc.className} variant="secondary">{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("es-CL")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(tx)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Transacción</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Detail label="Referencia" value={selected.transaction_ref} />
                <Detail label="Estado" value={(statusConfig[selected.status]?.label) ?? selected.status} />
                <Detail label="Nombre" value={selected.full_name} />
                <Detail label="RUT" value={selected.rut} />
                <Detail label="Email" value={selected.email} />
                <Detail label="Teléfono" value={selected.phone} />
                <Detail label="Tipo" value={typeLabels[selected.payment_type] ?? selected.payment_type} />
                <Detail label="Subtipo" value={selected.payment_subtype} />
                <Detail label="Monto" value={fmt(selected.amount)} />
                <Detail label="Plan" value={selected.plan_name} />
                <Detail label="Caso" value={selected.case_reference} />
                <Detail label="Fecha envío" value={selected.form_submitted_at ? new Date(selected.form_submitted_at).toLocaleString("es-CL") : "—"} />
              </div>

              {selected.donor_message && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Mensaje del donante</p>
                  <p className="bg-muted rounded p-2">{selected.donor_message}</p>
                </div>
              )}

              {selected.fraud_flags && selected.fraud_flags.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <p className="font-medium text-orange-800 text-xs mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Alertas de fraude
                  </p>
                  <ul className="text-xs text-orange-700 list-disc list-inside">
                    {selected.fraud_flags.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}

              {selected.proof_url && (
                <div>
                  <a
                    href={selected.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <Download className="w-4 h-4" /> Ver comprobante ({selected.proof_filename ?? "archivo"})
                  </a>
                </div>
              )}

              {/* Actions */}
              {!["confirmed", "rejected"].includes(selected.status) && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={updating}
                    onClick={() => updateStatus(selected.id, "confirmed")}
                  >
                    <Check className="w-4 h-4 mr-1" /> Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={updating}
                    onClick={() => updateStatus(selected.id, "rejected")}
                  >
                    <X className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-300 text-orange-700"
                    disabled={updating}
                    onClick={() => updateStatus(selected.id, "suspicious")}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" /> Sospechoso
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value ?? "—"}</p>
    </div>
  );
}
