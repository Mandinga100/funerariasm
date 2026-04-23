import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ConfirmDeleteDialog from "@/components/admin/ConfirmDeleteDialog";
import { Plus, Trash2, Save, Send, CheckCircle2, XCircle, FileText, Copy, Loader2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface QuoteItem {
  id?: string;
  position: number;
  category: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  line_total: number;
  notes: string | null;
  catalog_ref: string | null;
  _new?: boolean;
  _dirty?: boolean;
  _delete?: boolean;
}

interface Quote {
  id: string;
  case_id: string;
  quote_number: string;
  version: number;
  status: "borrador" | "enviada" | "aceptada" | "rechazada" | "vencida";
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  valid_until: string | null;
  client_notes: string | null;
  internal_notes: string | null;
  rejection_reason: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<Quote["status"], { label: string; color: string; icon: typeof FileText }> = {
  borrador: { label: "Borrador", color: "bg-muted text-muted-foreground", icon: FileText },
  enviada: { label: "Enviada", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300", icon: Send },
  aceptada: { label: "Aceptada", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  rechazada: { label: "Rechazada", color: "bg-destructive/15 text-destructive", icon: XCircle },
  vencida: { label: "Vencida", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300", icon: XCircle },
};

const CATEGORIES = [
  { id: "servicio", label: "Servicio funerario" },
  { id: "urna", label: "Urna / Cofre" },
  { id: "traslado", label: "Traslado" },
  { id: "ceremonia", label: "Ceremonia" },
  { id: "cremacion", label: "Cremación / Sepultación" },
  { id: "florería", label: "Florería" },
  { id: "tramites", label: "Trámites" },
  { id: "otros", label: "Otros" },
];

const fmt = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export default function CaseQuoteTab({ caseId, onSaved }: { caseId: string; onSaved?: () => void }) {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [validUntil, setValidUntil] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const active = useMemo(() => quotes.find(q => q.id === activeId) ?? null, [quotes, activeId]);
  const isEditable = active?.status === "borrador";

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("case_quotes")
      .select("*")
      .eq("case_id", caseId)
      .order("version", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Quote[];
    setQuotes(list);
    if (list.length > 0) {
      const accepted = list.find(q => q.status === "aceptada");
      const draft = list.find(q => q.status === "borrador");
      setActiveId(prev => prev && list.some(q => q.id === prev) ? prev : (accepted?.id ?? draft?.id ?? list[0].id));
    } else {
      setActiveId(null);
    }
    setLoading(false);
  }, [caseId, toast]);

  const fetchItems = useCallback(async (quoteId: string) => {
    const { data, error } = await supabase
      .from("case_quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("position", { ascending: true });
    if (error) {
      toast({ title: "Error cargando ítems", description: error.message, variant: "destructive" });
      return;
    }
    setItems(((data ?? []) as QuoteItem[]).map(i => ({ ...i, quantity: Number(i.quantity) })));
  }, [toast]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  useEffect(() => {
    if (!active) { setItems([]); return; }
    setDiscount(active.discount);
    setValidUntil(active.valid_until ?? "");
    setClientNotes(active.client_notes ?? "");
    setInternalNotes(active.internal_notes ?? "");
    setRejectionReason(active.rejection_reason ?? "");
    fetchItems(active.id);
  }, [active?.id, fetchItems]);

  // Realtime de cambios (otros usuarios o triggers)
  useEffect(() => {
    const ch = supabase
      .channel(`case-quotes-${caseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "case_quotes", filter: `case_id=eq.${caseId}` }, () => fetchQuotes())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [caseId, fetchQuotes]);

  const liveSubtotal = useMemo(
    () => items.filter(i => !i._delete).reduce((s, i) => s + Math.max(0, Math.round(i.quantity * i.unit_price) - (i.discount || 0)), 0),
    [items]
  );
  const liveTotal = Math.max(0, liveSubtotal - (discount || 0));

  const createNewVersion = async (cloneFrom?: Quote) => {
    setActionLoading("create");
    const { data: userData } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from("case_quotes")
      .insert({
        case_id: caseId,
        status: "borrador",
        currency: "CLP",
        created_by: userData.user?.id ?? null,
        client_notes: cloneFrom?.client_notes ?? null,
        internal_notes: cloneFrom?.internal_notes ?? null,
        valid_until: cloneFrom?.valid_until ?? null,
        discount: cloneFrom?.discount ?? 0,
      })
      .select()
      .single();

    if (error || !created) {
      toast({ title: "No se pudo crear la cotización", description: error?.message, variant: "destructive" });
      setActionLoading(null);
      return;
    }

    // Clonar ítems si aplica
    if (cloneFrom) {
      const { data: srcItems } = await supabase.from("case_quote_items").select("*").eq("quote_id", cloneFrom.id).order("position");
      if (srcItems && srcItems.length > 0) {
        const rows = srcItems.map((s, idx) => ({
          quote_id: created.id,
          position: idx,
          category: s.category,
          description: s.description,
          quantity: s.quantity,
          unit_price: s.unit_price,
          discount: s.discount,
          notes: s.notes,
          catalog_ref: s.catalog_ref,
        }));
        await supabase.from("case_quote_items").insert(rows);
      }
    }

    toast({ title: "✅ Cotización creada", description: `Versión #${created.version}` });
    setActiveId(created.id);
    await fetchQuotes();
    setActionLoading(null);
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      position: prev.filter(i => !i._delete).length,
      category: "servicio",
      description: "",
      quantity: 1,
      unit_price: 0,
      discount: 0,
      line_total: 0,
      notes: null,
      catalog_ref: null,
      _new: true,
      _dirty: true,
    }]);
  };

  const updateItem = (idx: number, patch: Partial<QuoteItem>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch, _dirty: true } : it));
  };

  const removeItem = (idx: number) => {
    setItems(prev => {
      const it = prev[idx];
      if (it._new) return prev.filter((_, i) => i !== idx);
      return prev.map((x, i) => i === idx ? { ...x, _delete: true, _dirty: true } : x);
    });
  };

  const saveDraft = async () => {
    if (!active) return;
    setSaving(true);

    // Header
    const { error: hErr } = await supabase
      .from("case_quotes")
      .update({
        discount: discount || 0,
        valid_until: validUntil || null,
        client_notes: clientNotes || null,
        internal_notes: internalNotes || null,
      })
      .eq("id", active.id);
    if (hErr) {
      toast({ title: "Error guardando cabecera", description: hErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Ítems: separar deletes / updates / inserts
    const toDelete = items.filter(i => i._delete && i.id);
    const toUpdate = items.filter(i => i.id && !i._new && !i._delete && i._dirty);
    const toInsert = items.filter(i => i._new && !i._delete);

    if (toDelete.length > 0) {
      const ids = toDelete.map(i => i.id!) ;
      const { error } = await supabase.from("case_quote_items").delete().in("id", ids);
      if (error) { toast({ title: "Error eliminando ítems", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }

    for (const it of toUpdate) {
      const { error } = await supabase
        .from("case_quote_items")
        .update({
          position: it.position,
          category: it.category,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount: it.discount,
          notes: it.notes,
          catalog_ref: it.catalog_ref,
        })
        .eq("id", it.id!);
      if (error) { toast({ title: "Error actualizando ítem", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }

    if (toInsert.length > 0) {
      const rows = toInsert.map(it => ({
        quote_id: active.id,
        position: it.position,
        category: it.category,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        discount: it.discount,
        notes: it.notes,
        catalog_ref: it.catalog_ref,
      }));
      const { error } = await supabase.from("case_quote_items").insert(rows);
      if (error) { toast({ title: "Error creando ítems", description: error.message, variant: "destructive" }); setSaving(false); return; }
    }

    toast({ title: "💾 Cotización guardada" });
    await fetchQuotes();
    await fetchItems(active.id);
    setSaving(false);
    onSaved?.();
  };

  const changeStatus = async (newStatus: Quote["status"], extra: Record<string, unknown> = {}) => {
    if (!active) return;
    setActionLoading(newStatus);
    const patch: Record<string, unknown> = { status: newStatus, ...extra };
    if (newStatus === "enviada") patch.sent_at = new Date().toISOString();
    if (newStatus === "rechazada") {
      patch.rejected_at = new Date().toISOString();
      patch.rejection_reason = rejectionReason || null;
    }
    const { error } = await supabase.from("case_quotes").update(patch as never).eq("id", active.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const labels: Record<string, string> = {
        enviada: "📤 Cotización marcada como enviada",
        aceptada: "✅ Cotización aceptada y sincronizada al caso",
        rechazada: "🚫 Cotización rechazada",
      };
      toast({ title: labels[newStatus] ?? "Estado actualizado" });
      await fetchQuotes();
      onSaved?.();
    }
    setActionLoading(null);
  };

  const deleteQuote = async () => {
    if (!active) return;
    const { error } = await supabase.from("case_quotes").delete().eq("id", active.id);
    if (error) {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "🗑️ Versión eliminada" });
      setActiveId(null);
      await fetchQuotes();
    }
    setDeleteOpen(false);
  };

  const copyQuoteSummary = async () => {
    if (!active) return;
    const lines = items.filter(i => !i._delete).map(i => `• ${i.description} — ${i.quantity} x ${fmt(i.unit_price)} = ${fmt(Math.max(0, Math.round(i.quantity * i.unit_price) - (i.discount || 0)))}`);
    const text = [
      `Cotización ${active.quote_number} (v${active.version})`,
      `Funeraria Santa Margarita`,
      "",
      ...lines,
      "",
      `Subtotal: ${fmt(liveSubtotal)}`,
      discount > 0 ? `Descuento: -${fmt(discount)}` : null,
      `TOTAL: ${fmt(liveTotal)}`,
      validUntil ? `Válida hasta: ${format(new Date(validUntil), "dd MMM yyyy", { locale: es })}` : null,
      clientNotes ? `\nNotas: ${clientNotes}` : null,
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "📋 Resumen copiado al portapapeles" });
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />Cargando cotizaciones…
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4" />Sin cotizaciones</CardTitle>
          <CardDescription>Crea la primera versión para empezar a cotizar este servicio.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={() => createNewVersion()} disabled={actionLoading === "create"}>
            {actionLoading === "create" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Crear cotización
          </Button>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = active ? STATUS_META[active.status].icon : FileText;

  return (
    <div className="space-y-4">
      {/* Selector de versiones */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={activeId ?? ""} onValueChange={setActiveId}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {quotes.map(q => (
              <SelectItem key={q.id} value={q.id}>
                v{q.version} · {q.quote_number} · {STATUS_META[q.status].label} · {fmt(q.total)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => createNewVersion(active ?? undefined)} disabled={actionLoading === "create"}>
          {actionLoading === "create" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          Nueva versión {active ? "(clonar)" : ""}
        </Button>
        {active && (
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={copyQuoteSummary}>
            <Copy className="w-3.5 h-3.5 mr-1" />Copiar resumen
          </Button>
        )}
      </div>

      {active && (
        <>
          {/* Header de la versión */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <StatusIcon className="w-4 h-4" />
                    {active.quote_number}
                    <Badge variant="outline" className="text-[10px]">v{active.version}</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Creada: {format(new Date(active.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                    {active.sent_at && ` · Enviada: ${format(new Date(active.sent_at), "dd MMM HH:mm", { locale: es })}`}
                    {active.accepted_at && ` · Aceptada: ${format(new Date(active.accepted_at), "dd MMM HH:mm", { locale: es })}`}
                  </CardDescription>
                </div>
                <Badge className={cn("text-[10px]", STATUS_META[active.status].color)}>
                  {STATUS_META[active.status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Válida hasta</label>
                  <Input type="date" className="h-8 text-xs mt-1" value={validUntil} onChange={e => setValidUntil(e.target.value)} disabled={!isEditable} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Descuento global (CLP)</label>
                  <Input type="number" min={0} className="h-8 text-xs mt-1" value={discount} onChange={e => setDiscount(parseInt(e.target.value) || 0)} disabled={!isEditable} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ítems */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Ítems</CardTitle>
                <CardDescription className="text-xs">Detalle de productos y servicios cotizados.</CardDescription>
              </div>
              {isEditable && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addItem}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Agregar ítem
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {items.filter(i => !i._delete).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin ítems. {isEditable ? "Agrega el primero." : ""}</p>
              ) : (
                <div className="space-y-2">
                  {items.map((it, idx) => {
                    if (it._delete) return null;
                    const lineTotal = Math.max(0, Math.round(it.quantity * it.unit_price) - (it.discount || 0));
                    return (
                      <div key={it.id ?? `new-${idx}`} className="rounded-md border p-2 space-y-2 bg-card">
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-12 sm:col-span-3">
                            <Select value={it.category ?? "servicio"} onValueChange={v => updateItem(idx, { category: v })} disabled={!isEditable}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-12 sm:col-span-9">
                            <Input
                              className="h-8 text-xs"
                              placeholder="Descripción del ítem"
                              value={it.description}
                              onChange={e => updateItem(idx, { description: e.target.value })}
                              disabled={!isEditable}
                            />
                          </div>
                          <div className="col-span-3 sm:col-span-2">
                            <label className="text-[10px] text-muted-foreground">Cant.</label>
                            <Input type="number" min={0} step="0.01" className="h-8 text-xs" value={it.quantity}
                              onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} disabled={!isEditable} />
                          </div>
                          <div className="col-span-4 sm:col-span-3">
                            <label className="text-[10px] text-muted-foreground">Precio unit.</label>
                            <Input type="number" min={0} className="h-8 text-xs" value={it.unit_price}
                              onChange={e => updateItem(idx, { unit_price: parseInt(e.target.value) || 0 })} disabled={!isEditable} />
                          </div>
                          <div className="col-span-3 sm:col-span-2">
                            <label className="text-[10px] text-muted-foreground">Dscto.</label>
                            <Input type="number" min={0} className="h-8 text-xs" value={it.discount}
                              onChange={e => updateItem(idx, { discount: parseInt(e.target.value) || 0 })} disabled={!isEditable} />
                          </div>
                          <div className="col-span-2 sm:col-span-3 flex flex-col items-end justify-end">
                            <span className="text-[10px] text-muted-foreground">Total</span>
                            <span className="text-xs font-semibold">{fmt(lineTotal)}</span>
                          </div>
                          {isEditable && (
                            <div className="col-span-12 sm:col-span-2 flex justify-end">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeItem(idx)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator />

              <div className="flex justify-end">
                <div className="text-right space-y-0.5 text-sm">
                  <p className="text-muted-foreground">Subtotal: <span className="font-medium text-foreground">{fmt(liveSubtotal)}</span></p>
                  {discount > 0 && <p className="text-muted-foreground">Descuento: <span className="font-medium text-destructive">-{fmt(discount)}</span></p>}
                  <p className="text-base font-semibold">Total: {fmt(liveTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Notas para el cliente</label>
                <Textarea className="text-xs mt-1 min-h-[60px]" value={clientNotes} onChange={e => setClientNotes(e.target.value)} disabled={!isEditable}
                  placeholder="Información que verá la familia (incluye en el envío)..." />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Notas internas</label>
                <Textarea className="text-xs mt-1 min-h-[50px]" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} disabled={!isEditable}
                  placeholder="Notas privadas del equipo..." />
              </div>
              {active.status === "rechazada" && active.rejection_reason && (
                <div>
                  <label className="text-[11px] font-medium text-destructive">Motivo de rechazo</label>
                  <p className="text-xs mt-1 p-2 rounded-md bg-destructive/5 border border-destructive/20">{active.rejection_reason}</p>
                </div>
              )}
              {active.status === "enviada" && (
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Motivo de rechazo (si corresponde)</label>
                  <Input className="h-8 text-xs mt-1" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Ej: precio fuera de presupuesto" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 justify-end">
            {isEditable && (
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />Eliminar
              </Button>
            )}
            {isEditable && (
              <>
                <Button size="sm" variant="secondary" onClick={saveDraft} disabled={saving}>
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                  Guardar borrador
                </Button>
                <Button size="sm" onClick={async () => { await saveDraft(); await changeStatus("enviada"); }} disabled={saving || actionLoading !== null}>
                  <Send className="w-3.5 h-3.5 mr-1" />Marcar enviada
                </Button>
              </>
            )}
            {active.status === "enviada" && (
              <>
                <Button size="sm" variant="outline" onClick={() => changeStatus("rechazada")} disabled={actionLoading !== null}>
                  <XCircle className="w-3.5 h-3.5 mr-1" />Rechazada
                </Button>
                <Button size="sm" onClick={() => changeStatus("aceptada")} disabled={actionLoading !== null}>
                  {actionLoading === "aceptada" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                  Aceptar y aplicar al caso
                </Button>
              </>
            )}
          </div>

          <ConfirmDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="¿Eliminar esta versión?"
            description={`Se eliminará la cotización ${active.quote_number} (v${active.version}) y todos sus ítems. Esta acción no se puede deshacer.`}
            onConfirm={deleteQuote}
          />
        </>
      )}
    </div>
  );
}
