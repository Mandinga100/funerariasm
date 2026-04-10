import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Phone, Mail, MapPin, Calendar, MessageSquare, Clock, DollarSign, Sparkles, Send, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface LeadDetailSheetProps {
  lead: any | null;
  onClose: () => void;
  onUpdate: () => void;
}

const PIPELINE_STAGES = [
  { id: "nuevo", label: "Nuevo" },
  { id: "contactado", label: "Contactado" },
  { id: "cotizado", label: "Cotizado" },
  { id: "contratado", label: "Contratado" },
  { id: "cerrado", label: "Cerrado" },
];

export default function LeadDetailSheet({ lead, onClose, onUpdate }: LeadDetailSheetProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("nota");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [classifying, setClassifying] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!lead) return;
    setEstimatedValue(lead.estimated_value?.toString() ?? "");
    loadNotes();
    loadActivities();
  }, [lead?.id]);

  const loadNotes = async () => {
    if (!lead) return;
    const { data } = await supabase
      .from("lead_notes")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setNotes(data ?? []);
  };

  const loadActivities = async () => {
    if (!lead) return;
    const { data } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setActivities(data ?? []);
  };

  const addNote = async () => {
    if (!newNote.trim() || !lead || !user) return;
    const { error } = await supabase.from("lead_notes").insert({
      lead_id: lead.id,
      author_id: user.id,
      content: newNote.trim(),
      note_type: noteType,
    });
    if (error) {
      toast({ title: "Error", description: "No se pudo agregar la nota", variant: "destructive" });
      return;
    }
    // Log activity
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      activity_type: noteType,
      description: `Nota (${noteType}): ${newNote.trim().substring(0, 100)}`,
      performed_by: user.id,
    });
    setNewNote("");
    loadNotes();
    loadActivities();
    toast({ title: "Nota agregada" });
  };

  const updateField = async (field: "pipeline_stage" | "estimated_value" | "next_follow_up" | "status", value: string | number | null) => {
    if (!lead) return;
    const { error } = await supabase.from("contact_leads").update({ [field]: value } as any).eq("id", lead.id);
    if (!error) {
      onUpdate();
      toast({ title: "Actualizado" });
    }
  };

  const classifyWithAI = async () => {
    if (!lead) return;
    setClassifying(true);
    try {
      await supabase.functions.invoke("classify-lead", { body: { leadId: lead.id } });
      toast({ title: "Clasificación IA completada" });
      onUpdate();
    } catch {
      toast({ title: "Error", description: "No se pudo clasificar", variant: "destructive" });
    }
    setClassifying(false);
  };

  const openWhatsApp = () => {
    if (!lead?.phone) return;
    const phone = lead.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  if (!lead) return null;

  const noteTypeIcons: Record<string, string> = {
    nota: "📝",
    llamada: "📞",
    email: "📧",
    whatsapp: "💬",
  };

  return (
    <Sheet open={!!lead} onOpenChange={() => onClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {lead.name ?? "Sin nombre"}
            {lead.urgency && (
              <Badge variant="outline" className={cn("text-[10px]", lead.urgency === "inmediata" ? "border-red-300 text-red-700" : "")}>
                {lead.urgency}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Contact Info */}
          <div className="space-y-2">
            {lead.phone && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{lead.phone}</div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={openWhatsApp}>
                  <ExternalLink className="w-3 h-3 mr-1" />WhatsApp
                </Button>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{lead.email}</div>
            )}
            {lead.comuna && (
              <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" />{lead.comuna}</div>
            )}
            <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" />{format(new Date(lead.created_at), "dd MMM yyyy HH:mm", { locale: es })}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: es })}
            </div>
          </div>

          <Separator />

          {/* Pipeline & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Etapa</label>
              <Select value={lead.pipeline_stage || "nuevo"} onValueChange={(v) => updateField("pipeline_stage", v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor Estimado</label>
              <div className="flex gap-1 mt-1">
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={estimatedValue}
                  onChange={e => setEstimatedValue(e.target.value)}
                  placeholder="$0"
                />
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => updateField("estimated_value", parseInt(estimatedValue) || 0)}>
                  <DollarSign className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Message */}
          {lead.message && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mensaje original</label>
              <div className="mt-1 p-3 rounded-md bg-muted/50 text-sm">{lead.message}</div>
            </div>
          )}

          {/* AI Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Análisis IA</label>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={classifyWithAI} disabled={classifying}>
                <Sparkles className="w-3 h-3 mr-1" />{classifying ? "Analizando..." : "Analizar"}
              </Button>
            </div>
            {lead.ai_summary ? (
              <div className="p-3 rounded-md bg-violet-50 border border-violet-200 text-sm">{lead.ai_summary}</div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin análisis aún. Haz clic en "Analizar" para clasificar.</p>
            )}
          </div>

          {lead.selected_plan && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Plan seleccionado</label>
              <Badge variant="secondary" className="mt-1">{lead.selected_plan}</Badge>
            </div>
          )}

          <Separator />

          {/* Add Note */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Agregar nota</label>
            <div className="flex gap-2">
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota">📝 Nota</SelectItem>
                  <SelectItem value="llamada">📞 Llamada</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              className="text-sm min-h-[60px]"
              placeholder="Escribe una nota..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <Button size="sm" className="w-full h-8" onClick={addNote} disabled={!newNote.trim()}>
              <Send className="w-3 h-3 mr-1" />Agregar
            </Button>
          </div>

          {/* Notes List */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Notas ({notes.length})</label>
              {notes.map(note => (
                <div key={note.id} className="p-2 rounded-md border bg-muted/30 text-sm">
                  <div className="flex items-center gap-1 mb-1">
                    <span>{noteTypeIcons[note.note_type] || "📝"}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(note.created_at), "dd/MM HH:mm")}
                    </span>
                  </div>
                  <p className="text-xs">{note.content}</p>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Activity Timeline */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Timeline de Actividad</label>
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin actividad registrada</p>
            ) : (
              <div className="space-y-1">
                {activities.map(act => (
                  <div key={act.id} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <p>{act.description}</p>
                      <p className="text-muted-foreground">{formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: es })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
