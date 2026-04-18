import { Crown, Wrench } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  isCeo: boolean;
  isAdmin: boolean;
  className?: string;
  /** Compacto solo muestra el icono+label corto sin descripción extra */
  compact?: boolean;
}

/**
 * Indicador visual permanente del nivel de acceso del usuario.
 * - CEO: badge dorado con corona — control total
 * - Admin: badge azul con llave inglesa — gestión operativa
 */
export default function RoleBadge({ isCeo, isAdmin, className, compact = false }: RoleBadgeProps) {
  if (!isCeo && !isAdmin) return null;

  const role = isCeo ? "ceo" : "admin";

  const config = role === "ceo"
    ? {
        Icon: Crown,
        label: "CEO",
        wrapper:
          "bg-[#C5A059]/15 border-[#C5A059]/50 text-[#C5A059] hover:bg-[#C5A059]/20",
        iconClass: "text-[#C5A059]",
        tooltipTitle: "👑 CEO — Control total",
        tooltipBody: [
          "• Acceso completo a todos los módulos del CRM",
          "• Gestión de Blog, Obituarios, Memoriales y Suscriptores",
          "• Analítica avanzada y ROI por comuna",
          "• Configuración de Ajustes IA y costos",
          "• Designar roles (Admin / CEO) en Equipo",
          "• Ver Auditoría e Integraciones",
        ],
      }
    : {
        Icon: Wrench,
        label: "Admin",
        wrapper:
          "bg-blue-500/15 border-blue-500/50 text-blue-400 hover:bg-blue-500/20",
        iconClass: "text-blue-400",
        tooltipTitle: "🔧 Admin — Gestión operativa",
        tooltipBody: [
          "• Gestión de Leads y pipeline comercial",
          "• Casos y Servicios funerarios",
          "• Tracking de familias",
          "• Pagos y verificación de transferencias",
          "• Configuración de su propia cuenta y perfil",
          "• Sin acceso a Blog, IA, Analítica ni Auditoría",
        ],
      };

  const { Icon, label, wrapper, iconClass, tooltipTitle, tooltipBody } = config;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Nivel de acceso: ${label}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-help shrink-0",
              wrapper,
              className
            )}
          >
            <Icon className={cn("w-3.5 h-3.5", iconClass)} aria-hidden />
            <span className="leading-none">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-[280px] p-3">
          <p className="font-semibold text-sm mb-1.5">{tooltipTitle}</p>
          {!compact && (
            <ul className="space-y-0.5 text-xs text-muted-foreground leading-relaxed">
              {tooltipBody.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
