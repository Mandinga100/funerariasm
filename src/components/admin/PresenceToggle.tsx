import { useMyPresence, formatPresenceDuration } from "@/hooks/use-operator-presence";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Toggle Online/Offline para el ejecutivo en el header del CRM.
 * Muestra el tiempo de la sesión actual + total acumulado al hacer hover.
 */
export default function PresenceToggle() {
  const { status, sessionSeconds, totalSeconds, toggle } = useMyPresence();
  const isOnline = status === "online";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => void toggle()}
            className="group flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1 hover:bg-muted transition-colors"
            aria-label={isOnline ? "Marcar offline" : "Marcar online"}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
              }`}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium leading-none">
              {isOnline ? "Online" : "Offline"}
            </span>
            {isOnline && (
              <span className="text-[10px] tabular-nums text-muted-foreground leading-none">
                {formatPresenceDuration(sessionSeconds)}
              </span>
            )}
            <Switch
              checked={isOnline}
              onCheckedChange={() => void toggle()}
              className="scale-75 -mr-1"
              aria-hidden="true"
              tabIndex={-1}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="font-semibold mb-0.5">
            {isOnline ? "Estás en línea" : "Estás fuera de línea"}
          </div>
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            {isOnline && (
              <div>
                Sesión actual:{" "}
                <span className="font-medium text-foreground">
                  {formatPresenceDuration(sessionSeconds)}
                </span>
              </div>
            )}
            <div>
              Total acumulado:{" "}
              <span className="font-medium text-foreground">
                {formatPresenceDuration(totalSeconds + (isOnline ? sessionSeconds : 0))}
              </span>
            </div>
            <div className="text-muted-foreground/70 mt-1">
              Cambia tu estado para recibir conversaciones reasignadas.
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
