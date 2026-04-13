import { useState } from "react";
import { Button } from "@/components/ui/button";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import AIClassificationCard from "./AIClassificationCard";

interface HistoryEntry {
  id: string;
  metadata: any;
  created_at: string;
}

interface Props {
  entries: HistoryEntry[];
  planName?: string | null;
}

export default function AIClassificationHistory({ entries, planName }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Skip if there's only 0-1 entries (current one is shown above)
  if (entries.length <= 1) return null;

  // Previous entries (skip the most recent since it's already displayed)
  const previous = entries.slice(1);
  const shown = expanded ? previous : previous.slice(0, 1);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <History className="w-3.5 h-3.5" />
        <span>Historial de análisis ({previous.length} anterior{previous.length > 1 ? "es" : ""})</span>
        {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      <div className="space-y-3">
        {shown.map((entry) => (
          <div key={entry.id} className="relative">
            {/* Timestamp label */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(entry.created_at), "dd MMM yyyy · HH:mm", { locale: es })}
                {" — "}
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: es })}
              </span>
            </div>
            <div className="ml-3 opacity-75 scale-[0.97] origin-top-left">
              <AIClassificationCard classification={entry.metadata} planName={planName} />
            </div>
          </div>
        ))}
      </div>

      {previous.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-6 text-[10px] text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Ocultar historial" : `Ver ${previous.length - 1} más`}
        </Button>
      )}
    </div>
  );
}
