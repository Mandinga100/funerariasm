import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SortableTable, type SortableColumn } from "@/components/admin/SortableTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, X, Eye, Download, DollarSign, Clock, AlertTriangle, CheckCircle2, Search, Volume2, VolumeX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/admin/DataTablePagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSortedRows } from "@/hooks/use-sorted-rows";
import { usePersistentFilters } from "@/hooks/use-persistent-filters";
import { useRowSelection } from "@/hooks/use-row-selection";
import { useAuth } from "@/hooks/useAuth";
import KpiCard from "@/components/admin/KpiCard";
import KpiDetailModal, { type KpiDetailColumn } from "@/components/admin/KpiDetailModal";
import BulkActionsBar from "@/components/admin/BulkActionsBar";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import SelectionCheckbox from "@/components/admin/SelectionCheckbox";
import { downloadCSV, downloadXLSX, todayStamp, type ExportColumn } from "@/lib/admin-export";

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
  initiated: { label: "Iniciado", className: "bg-muted text-muted-foreground" },
  transfer_reported: { label: "Informado", className: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300" },
  proof_uploaded: { label: "Con comprobante", className: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300" },
  pending_review: { label: "En revisión", className: "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300" },
  confirmed: { label: "Confirmado", className: "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300" },
  rejected: { label: "Rechazado", className: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300" },
  suspicious: { label: "Sospechoso", className: "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300" },
};

const PAYMENT_STATUS_PRIORITY: Record<string, number> = {
  confirmed: 1, pending_review: 2, proof_uploaded: 3, transfer_reported: 4, initiated: 5, suspicious: 6, rejected: 7,
};
const paymentStatusRank = (s: string) => PAYMENT_STATUS_PRIORITY[s] ?? 99;

const typeLabels: Record<string, string> = {
  servicio: "Servicio Funerario",
  planificacion: "Planificación Anticipada",
  donacion: "Donación Legado Eterno",
};

const fmt = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

type KpiKey = "pending" | "confirmed" | "suspicious" | "casesRevenue" | null;

const KPI_TITLES: Record<Exclude<KpiKey, null>, { title: string; description: string }> = {
  pending: {
    title: "Pagos pendientes de revisión",
    description: "Transacciones notificadas que requieren tu validación manual.",
  },
  confirmed: {
    title: "Pagos confirmados",
    description: "Transacciones aprobadas y verificadas por el equipo.",
  },
  suspicious: {
    title: "Pagos sospechosos",
    description: "Transacciones con alertas de fraude o marcadas manualmente.",
  },
  casesRevenue: {
    title: "Ingresos por Casos contratados",
    description: "Casos cerrados con pago confirmado que generaron ingresos.",
  },
};

interface CaseRevenueRow {
  id: string;
  case_number: string;
  client_name: string | null;
  selected_plan: string | null;
  total_amount: number;
  created_at: string;
}

export default function AdminPagos() {
  const { isCeo } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [updating, setUpdating] = useState(false);
  const { filters, setFilter, hydrated: filtersHydrated } = usePersistentFilters("admin_pagos", {
    filterStatus: "all",
    filterType: "all",
    searchQuery: "",
  });
  const { filterStatus, filterType, searchQuery } = filters;
  const [casesRevenue, setCasesRevenue] = useState(0);
  const [casesRevenueRows, setCasesRevenueRows] = useState<CaseRevenueRow[]>([]);
  const [activeKpi, setActiveKpi] = useState<KpiKey>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem("admin_notification_sound");
    return stored !== "false";
  });
  const { toast } = useToast();
  const { playNotification } = useNotificationSound();

  const selection = useRowSelection<Transaction>((r) => r.id);

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

  useEffect(() => { load(); loadCasesRevenue(); }, []);

  const loadCasesRevenue = async () => {
    const { data } = await supabase
      .from("service_cases")
      .select("id, case_number, client_name, selected_plan, total_amount, created_at")
      .eq("pipeline_stage", "contratado")
      .eq("payment_status", "pagado")
      .order("created_at", { ascending: false });
    const rows = (data as CaseRevenueRow[]) ?? [];
    setCasesRevenueRows(rows);
    setCasesRevenue(rows.reduce((acc, c) => acc + (c.total_amount || 0), 0));
  };

  // Realtime
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
              description: `${tx.full_name} — ${fmt(tx.amount)}`,
            });
          } else if (payload.eventType === "UPDATE") {
            setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
            const label = statusConfig[tx.status]?.label ?? tx.status;
            toast({ title: "Estado actualizado", description: `${tx.transaction_ref} → ${label}` });
          } else if (payload.eventType === "DELETE") {
            const oldTx = payload.old as Transaction;
            setTransactions(prev => prev.filter(t => t.id !== oldTx.id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => transactions.filter(tx => {
    if (filterStatus !== "all" && tx.status !== filterStatus) return false;
    if (filterType !== "all" && tx.payment_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!tx.full_name.toLowerCase().includes(q) && !tx.transaction_ref.toLowerCase().includes(q) && !tx.rut.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [transactions, filterStatus, filterType, searchQuery]);

  const { sorted, sortHandled } = useSortedRows<Transaction>("admin_pagos", filtered, {
    status: (r) => paymentStatusRank(r.status),
    amount: (r) => r.amount,
    created_at: (r) => new Date(r.created_at).getTime(),
    payment_type: (r) => typeLabels[r.payment_type] ?? r.payment_type,
  });
  const { page, pageSize, totalPages, from, to, setPage, setPageSize } = usePagination("pagos", sorted.length);
  const paginatedRows = sorted.slice(from, to + 1);

  useEffect(() => { if (filtersHydrated) setPage(1); }, [filterStatus, filterType, searchQuery, filtersHydrated, setPage]);

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

  const stats = useMemo(() => ({
    total: transactions.length,
    pending: transactions.filter(t => ["transfer_reported", "proof_uploaded", "pending_review"].includes(t.status)).length,
    confirmed: transactions.filter(t => t.status === "confirmed").length,
    suspicious: transactions.filter(t => t.status === "suspicious" || (t.fraud_flags && t.fraud_flags.length > 0)).length,
  }), [transactions]);

  const kpiRows = useMemo<Transaction[]>(() => {
    if (activeKpi === "pending")
      return transactions.filter(t => ["transfer_reported", "proof_uploaded", "pending_review"].includes(t.status));
    if (activeKpi === "confirmed")
      return transactions.filter(t => t.status === "confirmed");
    if (activeKpi === "suspicious")
      return transactions.filter(t => t.status === "suspicious" || (t.fraud_flags && t.fraud_flags.length > 0));
    return [];
  }, [activeKpi, transactions]);

  /* ─── Export ─── */
  const exportColumns: ExportColumn<Transaction>[] = [
    { key: "transaction_ref", label: "Referencia", accessor: (r) => r.transaction_ref },
    { key: "full_name", label: "Nombre", accessor: (r) => r.full_name },
    { key: "rut", label: "RUT", accessor: (r) => r.rut },
    { key: "email", label: "Email", accessor: (r) => r.email },
    { key: "phone", label: "Teléfono", accessor: (r) => r.phone },
    { key: "payment_type", label: "Tipo", accessor: (r) => typeLabels[r.payment_type] ?? r.payment_type },
    { key: "payment_subtype", label: "Subtipo", accessor: (r) => r.payment_subtype ?? "" },
    { key: "amount", label: "Monto", accessor: (r) => r.amount },
    { key: "currency", label: "Moneda", accessor: (r) => r.currency },
    { key: "status", label: "Estado", accessor: (r) => statusConfig[r.status]?.label ?? r.status },
    { key: "plan_name", label: "Plan", accessor: (r) => r.plan_name ?? "" },
    { key: "case_reference", label: "Caso", accessor: (r) => r.case_reference ?? "" },
    { key: "created_at", label: "Fecha", accessor: (r) => new Date(r.created_at).toLocaleString("es-CL") },
  ];

  const exportRows = (rows: Transaction[], format: "csv" | "xlsx") => {
    if (rows.length === 0) {
      toast({ title: "Sin datos", description: "No hay transacciones para exportar." });
      return;
    }
    const filename = `transacciones_${todayStamp()}`;
    if (format === "csv") downloadCSV(rows, exportColumns, filename);
    else downloadXLSX(rows, exportColumns, filename, "Transacciones");
    toast({ title: "Exportación completada", description: `${rows.length} transacciones exportadas.` });
  };

  /* ─── Delete ─── */
  const handleBulkDelete = async () => {
    const ids = Array.from(selection.selectedIds);
    if (ids.length === 0) return;
    setDeleting(true);
    const { error } = await supabase.from("payment_transactions").delete().in("id", ids);
    setDeleting(false);
    setConfirmDeleteOpen(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await logAudit({
      action: "delete", module: "pagos",
      description: `Eliminó ${ids.length} transacciones`,
      entity_type: "payment_transaction",
    });
    toast({ title: "Eliminadas", description: `${ids.length} transacciones eliminadas.` });
    selection.clear();
    load();
  };

  const selectionStateForPage = selection.getSelectionStateFor(paginatedRows);

  /* ─── KPI modal columns (compactas) ─── */
  const kpiColumns: KpiDetailColumn<Transaction>[] = [
    { key: "ref", label: "Ref.", cell: (r) => <span className="font-mono text-xs">{r.transaction_ref}</span>, exportAccessor: (r) => r.transaction_ref },
    { key: "name", label: "Cliente", cell: (r) => <span className="font-medium">{r.full_name}</span>, exportAccessor: (r) => r.full_name },
    { key: "type", label: "Tipo", cell: (r) => <Badge variant="secondary" className="text-xs">{typeLabels[r.payment_type] ?? r.payment_type}</Badge>, exportAccessor: (r) => typeLabels[r.payment_type] ?? r.payment_type },
    { key: "amount", label: "Monto", align: "right", cell: (r) => <span className="font-semibold tabular-nums">{fmt(r.amount)}</span>, exportAccessor: (r) => r.amount },
    {
      key: "status", label: "Estado",
      cell: (r) => {
        const sc = statusConfig[r.status] ?? { label: r.status, className: "bg-muted" };
        return <Badge className={sc.className} variant="secondary">{sc.label}</Badge>;
      },
      exportAccessor: (r) => statusConfig[r.status]?.label ?? r.status,
    },
    { key: "date", label: "Fecha", align: "right", cell: (r) => <span className="text-xs text-muted-foreground tabular-nums">{new Date(r.created_at).toLocaleDateString("es-CL")}</span>, exportAccessor: (r) => new Date(r.created_at).toLocaleDateString("es-CL") },
  ];

  const caseRevenueColumns: KpiDetailColumn<CaseRevenueRow>[] = [
    { key: "case", label: "Caso", cell: (r) => <span className="font-mono text-xs">{r.case_number}</span>, exportAccessor: (r) => r.case_number },
    { key: "client", label: "Cliente", cell: (r) => r.client_name ?? "—", exportAccessor: (r) => r.client_name ?? "" },
    { key: "plan", label: "Plan", cell: (r) => r.selected_plan ? <Badge variant="secondary" className="text-xs">{r.selected_plan}</Badge> : "—", exportAccessor: (r) => r.selected_plan ?? "" },
    { key: "amount", label: "Monto", align: "right", cell: (r) => <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(r.total_amount)}</span>, exportAccessor: (r) => r.total_amount },
    { key: "date", label: "Fecha", align: "right", cell: (r) => <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("es-CL")}</span>, exportAccessor: (r) => new Date(r.created_at).toLocaleDateString("es-CL") },
  ];

  const isCasesKpi = activeKpi === "casesRevenue";

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
        </div>
      </div>

      {/* KPI Cards (clicables) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Total Transacciones" value={stats.total} icon={DollarSign} iconClassName="text-primary" />
        <KpiCard
          label="Pendientes" value={stats.pending} icon={Clock}
          iconClassName="text-yellow-600 dark:text-yellow-400 bg-yellow-100/60 dark:bg-yellow-950/40"
          accentClassName="bg-yellow-500"
          hint="Ver detalle"
          onClick={stats.pending > 0 ? () => setActiveKpi("pending") : undefined}
        />
        <KpiCard
          label="Confirmados" value={stats.confirmed} icon={CheckCircle2}
          iconClassName="text-green-600 dark:text-green-400 bg-green-100/60 dark:bg-green-950/40"
          accentClassName="bg-green-500"
          hint="Ver detalle"
          onClick={stats.confirmed > 0 ? () => setActiveKpi("confirmed") : undefined}
        />
        <KpiCard
          label="Sospechosos" value={stats.suspicious} icon={AlertTriangle}
          iconClassName="text-orange-600 dark:text-orange-400 bg-orange-100/60 dark:bg-orange-950/40"
          accentClassName="bg-orange-500"
          hint="Ver detalle"
          onClick={stats.suspicious > 0 ? () => setActiveKpi("suspicious") : undefined}
        />
        <KpiCard
          label="Ingresos por Casos" value={fmt(casesRevenue)} icon={DollarSign}
          iconClassName="text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40"
          accentClassName="bg-emerald-500"
          valueSize="md"
          hint={casesRevenueRows.length ? `${casesRevenueRows.length} casos` : "Sin casos"}
          onClick={casesRevenueRows.length > 0 ? () => setActiveKpi("casesRevenue") : undefined}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nombre, ref o RUT..." value={searchQuery} onChange={(e) => setFilter("searchQuery", e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 sm:w-40">
            <Select value={filterStatus} onValueChange={(v) => setFilter("filterStatus", v)}>
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
            <Select value={filterType} onValueChange={(v) => setFilter("filterType", v)}>
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
          <Button variant="ghost" size="sm" onClick={() => { setFilter("filterStatus", "all"); setFilter("filterType", "all"); setFilter("searchQuery", ""); }}>
            <X className="w-4 h-4 mr-1" /> Limpiar
          </Button>
        )}
        <Badge variant="outline" className="self-center shrink-0">{filtered.length}/{transactions.length}</Badge>
      </div>

      {/* Bulk actions bar */}
      <BulkActionsBar
        count={selection.count}
        totalLabel={selection.count === 1 ? "transacción seleccionada" : "transacciones seleccionadas"}
        onClear={selection.clear}
        onExportCSV={() => exportRows(selection.getSelectedRows(transactions), "csv")}
        onExportXLSX={() => exportRows(selection.getSelectedRows(transactions), "xlsx")}
        onDelete={() => setConfirmDeleteOpen(true)}
        canDelete={isCeo}
        helperText={!isCeo ? "Solo el CEO puede eliminar transacciones" : undefined}
      />

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No hay transacciones que coincidan con los filtros.</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <SortableTable<Transaction>
              tableKey="admin_pagos"
              rows={paginatedRows}
              rowKey={(r) => r.id}
              onRowClick={(r) => setSelected(r)}
              externalSort={sortHandled}
              selection={{
                isSelected: selection.isSelected,
                toggle: selection.toggle,
                headerState: selectionStateForPage,
                toggleAll: () => selection.toggleAll(paginatedRows),
              }}
              columns={[
                { key: "transaction_ref", label: "Ref", defaultWidth: 160, cell: (r) => <span className="font-mono text-xs">{r.transaction_ref}</span> },
                {
                  key: "full_name", label: "Nombre", defaultWidth: 220,
                  cell: (r) => (
                    <span className="font-medium">
                      {r.full_name}
                      {r.fraud_flags && r.fraud_flags.length > 0 && <AlertTriangle className="inline ml-1 w-3 h-3 text-orange-500" />}
                    </span>
                  ),
                },
                { key: "payment_type", label: "Tipo", defaultWidth: 140, cell: (r) => <Badge variant="secondary" className="text-xs">{typeLabels[r.payment_type] ?? r.payment_type}</Badge> },
                { key: "amount", label: "Monto", defaultWidth: 130, cell: (r) => <span className="font-semibold">{fmt(r.amount)}</span> },
                {
                  key: "status", label: "Estado", defaultWidth: 140,
                  cell: (r) => {
                    const sc = statusConfig[r.status] ?? { label: r.status, className: "bg-muted" };
                    return <Badge className={sc.className} variant="secondary">{sc.label}</Badge>;
                  },
                },
                { key: "created_at", label: "Fecha", defaultWidth: 130, cell: (r) => <span className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString("es-CL")}</span> },
                {
                  key: "actions", label: "", sortable: false, resizable: false, defaultWidth: 80, align: "right", cellClassName: "text-right",
                  cell: (r) => (
                    <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  ),
                } satisfies SortableColumn<Transaction>,
              ]}
            />
          </div>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {paginatedRows.map(tx => {
              const sc = statusConfig[tx.status] ?? { label: tx.status, className: "bg-muted" };
              const hasFraud = tx.fraud_flags && tx.fraud_flags.length > 0;
              const isSel = selection.isSelected(tx.id);
              return (
                <div
                  key={tx.id}
                  className={cn(
                    "border rounded-lg p-3 space-y-2 cursor-pointer active:bg-muted/30",
                    hasFraud && "border-orange-300 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20",
                    isSel && "ring-2 ring-primary/40 bg-primary/5",
                  )}
                  onClick={() => setSelected(tx)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <SelectionCheckbox state={isSel} onChange={() => selection.toggle(tx.id)} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {tx.full_name}
                          {hasFraud && <AlertTriangle className="inline ml-1 w-3 h-3 text-orange-500" />}
                        </p>
                        <code className="text-[10px] text-muted-foreground font-mono">{tx.transaction_ref}</code>
                      </div>
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
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalCount={filtered.length}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemLabel={{ singular: "transacción", plural: "transacciones" }}
      />

      {/* KPI detail modal */}
      <KpiDetailModal<Transaction>
        open={!!activeKpi && !isCasesKpi}
        onClose={() => setActiveKpi(null)}
        title={activeKpi && !isCasesKpi ? KPI_TITLES[activeKpi].title : ""}
        description={activeKpi && !isCasesKpi ? KPI_TITLES[activeKpi].description : undefined}
        rows={kpiRows}
        rowKey={(r) => r.id}
        columns={kpiColumns}
        onRowClick={(r) => { setSelected(r); setActiveKpi(null); }}
        onExportCSV={() => {
          const cols = kpiColumns.filter(c => c.exportAccessor).map(c => ({ key: c.key, label: c.label, accessor: c.exportAccessor! }));
          downloadCSV(kpiRows, cols, `pagos_${activeKpi}_${todayStamp()}`);
        }}
        onExportXLSX={() => {
          const cols = kpiColumns.filter(c => c.exportAccessor).map(c => ({ key: c.key, label: c.label, accessor: c.exportAccessor! }));
          downloadXLSX(kpiRows, cols, `pagos_${activeKpi}_${todayStamp()}`, "Pagos");
        }}
        totalLabel={kpiRows.length === 1 ? "transacción" : "transacciones"}
        summary={
          activeKpi && !isCasesKpi ? (
            <p className="text-xs text-muted-foreground">
              Total agregado: <span className="font-semibold text-foreground">{fmt(kpiRows.reduce((s, r) => s + r.amount, 0))}</span>
            </p>
          ) : null
        }
      />

      {/* KPI detail modal: Cases revenue */}
      <KpiDetailModal<CaseRevenueRow>
        open={isCasesKpi}
        onClose={() => setActiveKpi(null)}
        title={KPI_TITLES.casesRevenue.title}
        description={KPI_TITLES.casesRevenue.description}
        rows={casesRevenueRows}
        rowKey={(r) => r.id}
        columns={caseRevenueColumns}
        onExportCSV={() => {
          const cols = caseRevenueColumns.filter(c => c.exportAccessor).map(c => ({ key: c.key, label: c.label, accessor: c.exportAccessor! }));
          downloadCSV(casesRevenueRows, cols, `ingresos_casos_${todayStamp()}`);
        }}
        onExportXLSX={() => {
          const cols = caseRevenueColumns.filter(c => c.exportAccessor).map(c => ({ key: c.key, label: c.label, accessor: c.exportAccessor! }));
          downloadXLSX(casesRevenueRows, cols, `ingresos_casos_${todayStamp()}`, "Ingresos por Casos");
        }}
        totalLabel={casesRevenueRows.length === 1 ? "caso" : "casos"}
        summary={
          <p className="text-xs text-muted-foreground">
            Ingresos totales: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(casesRevenue)}</span>
          </p>
        }
      />

      {/* Confirm bulk delete */}
      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleBulkDelete}
        count={selection.count}
        itemLabel={{ singular: "transacción", plural: "transacciones" }}
        loading={deleting}
      />

      {/* Detail dialog (single) */}
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
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded p-3">
                  <p className="font-medium text-orange-800 dark:text-orange-300 text-xs mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Alertas de fraude
                  </p>
                  <ul className="text-xs text-orange-700 dark:text-orange-400 list-disc list-inside">
                    {selected.fraud_flags.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}

              {selected.proof_url && (
                <div>
                  <a href={selected.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
                    <Download className="w-4 h-4" /> Ver comprobante ({selected.proof_filename ?? "archivo"})
                  </a>
                </div>
              )}

              {!["confirmed", "rejected"].includes(selected.status) && (
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={updating} onClick={() => updateStatus(selected.id, "confirmed")}>
                    <Check className="w-4 h-4 mr-1" /> Confirmar
                  </Button>
                  <Button size="sm" variant="destructive" className="flex-1" disabled={updating} onClick={() => updateStatus(selected.id, "rejected")}>
                    <X className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400" disabled={updating} onClick={() => updateStatus(selected.id, "suspicious")}>
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
