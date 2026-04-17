import { ReactNode, useEffect, useState, cloneElement, isValidElement, MouseEvent, Children } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, AlertTriangle } from "lucide-react";
import {
  getAiActionSetting,
  recordAiInvocation,
  confirmDisabledAction,
  type AiActionSetting,
} from "@/lib/ai-actions";

interface AIActionTooltipProps {
  /** Texto descriptivo: explica brevemente qué hace la acción de IA. */
  description: string;
  /** Lado donde se muestra el tooltip. */
  side?: "top" | "right" | "bottom" | "left";
  /**
   * Clave catálogo en `ai_action_settings.action_key`.
   * Si se pasa: respeta el toggle global, registra la invocación y muestra
   * advertencia visual cuando esté apagada.
   */
  actionKey?: string;
  children: ReactNode;
}

/**
 * Wrapper unificado para todo botón de IA del CRM.
 * - Tooltip con descripción al hover.
 * - Si recibe `actionKey`, integra con `/admin/ajustes/ia`:
 *    · pide confirmación si la acción está apagada por política,
 *    · registra cada invocación en `ai_action_invocations`.
 */
export function AIActionTooltip({ description, side = "top", actionKey, children }: AIActionTooltipProps) {
  const [setting, setSetting] = useState<AiActionSetting | null>(null);

  useEffect(() => {
    if (!actionKey) return;
    let active = true;
    void getAiActionSetting(actionKey).then((s) => {
      if (active) setSetting(s);
    });
    return () => {
      active = false;
    };
  }, [actionKey]);

  // Intercepta el click del hijo (debe ser un único elemento) para aplicar
  // el confirm de toggle desactivado y registrar la invocación.
  const child = Children.only(children);
  let interceptedChild = child;
  if (actionKey && isValidElement(child)) {
    const original = (child.props as { onClick?: (e: MouseEvent) => void }).onClick;
    interceptedChild = cloneElement(child as React.ReactElement<{ onClick?: (e: MouseEvent) => void }>, {
      onClick: async (e: MouseEvent) => {
        if (setting && !setting.enabled) {
          const proceed = await confirmDisabledAction(actionKey);
          if (!proceed) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        void recordAiInvocation(actionKey);
        original?.(e);
      },
    });
  }

  const disabledByPolicy = !!actionKey && setting !== null && !setting.enabled;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex relative">
            {interceptedChild}
            {disabledByPolicy && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-destructive border border-background shadow-sm"
              />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-xs bg-popover border-gold/30 text-popover-foreground text-xs leading-relaxed"
        >
          <div className="flex gap-2 items-start">
            <Sparkles className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="block">{description}</span>
              {disabledByPolicy && (
                <span className="flex items-center gap-1 text-destructive font-medium">
                  <AlertTriangle className="w-3 h-3" /> Desactivada en Ajustes › IA
                </span>
              )}
              {setting && setting.enabled && setting.estimated_cost_usd > 0 && (
                <span className="block text-[10px] text-muted-foreground">
                  Costo estimado: ${setting.estimated_cost_usd.toFixed(3)} USD por uso
                </span>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AIActionTooltip;
