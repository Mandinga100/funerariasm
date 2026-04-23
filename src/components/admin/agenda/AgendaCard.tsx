import { AgendaEvent, eventTypeOf, priorityOf } from "@/lib/agenda-config";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, User, Briefcase, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  event: AgendaEvent;
  onClick: () => void;
  assigneeName?: string | null;
  caseRef?: string | null;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === tomorrow.toDateString()) return "Mañana";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
};

export default function AgendaCard({ event, onClick, assigneeName, caseRef, draggable, onDragStart }: Props) {
  const t = eventTypeOf(event.event_type);
  const p = priorityOf(event.priority);
  const isPastNotDone = new Date(event.end_at) < new Date() && !["finalizado", "cancelado"].includes(event.status);

  return (
    <button
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-3 hover:shadow-md hover:border-primary/40 transition-all",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        isPastNotDone && "border-rose-300 dark:border-rose-800",
        event.priority === "critica" && "ring-1 ring-rose-400/50"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base shrink-0" aria-hidden>{t.emoji}</span>
          <span className="text-xs font-medium text-muted-foreground truncate">{t.label}</span>
        </div>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0", p.className)}>{p.label}</Badge>
      </div>

      <p className="text-sm font-semibold text-foreground line-clamp-2 mb-2">{event.title}</p>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 shrink-0" />
          <span>{fmtDate(event.start_at)} · {fmtTime(event.start_at)}–{fmtTime(event.end_at)}</span>
        </div>
        {(event.location_name || event.comuna) && (
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{[event.location_name, event.comuna].filter(Boolean).join(" · ")}</span>
          </div>
        )}
        {assigneeName && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{assigneeName}</span>
          </div>
        )}
        {caseRef && (
          <div className="flex items-center gap-1.5 truncate">
            <Briefcase className="w-3 h-3 shrink-0" />
            <span className="truncate font-mono text-[10px]">{caseRef}</span>
          </div>
        )}
        {event.contact_phone && (
          <div className="flex items-center gap-1.5 truncate">
            <MessageSquare className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.contact_name ?? event.contact_phone}</span>
          </div>
        )}
      </div>

      {isPastNotDone && (
        <div className="mt-2 text-[10px] font-semibold text-rose-600 dark:text-rose-400">⚠ Vencido sin cerrar</div>
      )}
    </button>
  );
}
