import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";

interface AIActionTooltipProps {
  /** Texto descriptivo: explica brevemente qué hace la acción de IA. */
  description: string;
  /** Lado donde se muestra el tooltip. */
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}

/**
 * Wrapper unificado para todo botón de IA del CRM.
 * Muestra un tooltip al hacer hover con una descripción breve de la acción IA.
 * Usar SIEMPRE para envolver botones que disparan funciones de IA (generar, clasificar, estandarizar, resumir, etc.).
 */
export function AIActionTooltip({ description, side = "top", children }: AIActionTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs bg-popover border-gold/30 text-popover-foreground text-xs leading-relaxed"
        >
          <div className="flex gap-2 items-start">
            <Sparkles className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
            <span>{description}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AIActionTooltip;
