import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Eye, Download, DollarSign, Clock, AlertTriangle, CheckCircle2, Search, FileDown, ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [updating, setUpdating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem("admin_notification_sound");
    return stored !== "false";
  });
  const { toast } = useToast();
  const { playNotification } = useNotificationSound();

  // Auto-open transaction from notification link
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId && transactions.length > 0) {
      const found = transactions.find(t => t.id === openId);
      if (found) {
        setSelected(found);
        const next = new URLSearchParams(searchParams);
        next.delete("open");
        setSearchParams(next, { replace: true });
      }
    }
  }, [transactions, searchParams]);

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

  // Realtime subscription for new transactions
  useEffect(() => {
    const channel = supabase
      .channel(`admin-payments-realtime-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_transactions" },
        (payload) => {
          const tx = payload.new as Transaction;
          if (payload.eventType === "INSERT") {
            setTransactions(prev => [tx, ...prev]);
            if (soundEnabled) playNotification();
            toast({
              title: "Nueva transacción",
              description: `${tx.full_name} — ${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(tx.amount)}`,
            });
          } else if (payload.eventType === "UPDATE") {
            setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
            const label = statusConfig[tx.status]?.label ?? tx.status;
            toast({
              title: "Estado actualizado",
              description: `${tx.transaction_ref} → ${label}`,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = transactions.filter(tx => {
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    if (filterType !== "all" && tx.payment_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!tx.full_name.toLowerCase().includes(q) && !tx.transaction_ref.toLowerCase().includes(q) && !tx.rut.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [filterStatus, filterType, searchQuery]);

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

  const exportCSV = () => {
    const headers = ["Referencia","Nombre","RUT","Email","Teléfono","Tipo","Subtipo","Monto","Moneda","Estado","Plan","Caso","Fecha"];
    const rows = filtered.map(tx => [
      tx.transaction_ref, tx.full_name, tx.rut, tx.email, tx.phone,
      typeLabels[tx.payment_type] ?? tx.payment_type, tx.payment_subtype ?? "",
      tx.amount, tx.currency, statusConfig[tx.status]?.label ?? tx.status,
      tx.plan_name ?? "", tx.case_reference ?? "",
      new Date(tx.created_at).toLocaleDateString("es-CL"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacciones_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Transacciones</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => {
            setSoundEnabled(prev => { const next = !prev; localStorage.setItem("admin_notification_sound", String(next)); return next; });
          }} title={soundEnabled ? "Silenciar" : "Activar sonido"}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <FileDown className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nombre, ref o RUT..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 sm:w-40">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 sm:w-44">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {(filterStatus !== "all" || filterType !== "all" || searchQuery) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus("all"); setFilterType("all"); setSearchQuery(""); }}>
            <X className="w-4 h-4 mr-1" /> Limpiar
          </Button>
        )}
        <Badge variant="outline" className="self-center shrink-0">{filtered.length}/{transactions.length}</Badge>
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
        <>
          {/* Desktop table */}
          <div className="rounded-md border hidden md:block">
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
                {paginatedRows.map(tx => {
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
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paginatedRows.map(tx => {
              const sc = statusConfig[tx.status] ?? { label: tx.status, className: "bg-muted" };
              const hasFraud = tx.fraud_flags && tx.fraud_flags.length > 0;
              return (
                <div key={tx.id} className={cn("border rounded-lg p-3 space-y-2 cursor-pointer active:bg-muted/30", hasFraud && "border-orange-300 bg-orange-50/30")} onClick={() => setSelected(tx)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.full_name}
                        {hasFraud && <AlertTriangle className="inline ml-1 w-3 h-3 text-orange-500" />}
                      </p>
                      <code className="text-[10px] text-muted-foreground font-mono">{tx.transaction_ref}</code>
                    </div>
                    <p className="text-sm font-bold shrink-0">{fmt(tx.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className={cn("text-[10px]", sc.className)}>{sc.label}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{typeLabels[tx.payment_type] ?? tx.payment_type}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{new Date(tx.created_at).toLocaleDateString("es-CL")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Pág. {currentPage}/{totalPages} ({filtered.length})
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline ml-1">Anterior</span>
            </Button>
            <span className="text-xs px-2 text-muted-foreground sm:hidden">{currentPage}/{totalPages}</span>
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  typeof p === "string" ? (
                    <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
                  ) : (
                    <Button key={p} variant={p === currentPage ? "default" : "outline"} size="sm" className="w-9" onClick={() => setCurrentPage(p)}>
                      {p}
                    </Button>
                  )
                )}
            </div>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <span className="hidden sm:inline mr-1">Siguiente</span><ChevronRight className="w-4 h-4" />
            </Button>
          </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={updating} onClick={() => updateStatus(selected.id, "confirmed")}>
                    <Check className="w-4 h-4 mr-1" /> Confirmar
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" disabled={updating} onClick={() => updateStatus(selected.id, "rejected")}>
                    <X className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-orange-300 text-orange-700" disabled={updating} onClick={() => updateStatus(selected.id, "suspicious")}>
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
