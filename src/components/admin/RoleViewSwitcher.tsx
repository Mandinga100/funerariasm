import { Eye, ShieldCheck, UserCog, User } from "lucide-react";
import { useRoleView, type RoleView } from "@/hooks/useRoleView";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Selector de vista de rol — sólo visible para CEO.
 * Permite simular cómo se ve el CRM como Administrador o Moderador.
 * Persistido en sessionStorage para no afectar otros dispositivos.
 */
export default function RoleViewSwitcher() {
  const { canSwitch, view, setView } = useRoleView();

  if (!canSwitch) return null;

  const options: { id: RoleView; label: string; icon: typeof Eye; tone: string }[] = [
    { id: "real", label: "CEO", icon: ShieldCheck, tone: "data-[active=true]:bg-[#C5A059]/15 data-[active=true]:text-[#C5A059] data-[active=true]:border-[#C5A059]/40" },
    { id: "admin", label: "Admin", icon: UserCog, tone: "data-[active=true]:bg-blue-500/15 data-[active=true]:text-blue-600 dark:data-[active=true]:text-blue-400 data-[active=true]:border-blue-500/40" },
    { id: "moderator", label: "Moderador", icon: User, tone: "data-[active=true]:bg-emerald-500/15 data-[active=true]:text-emerald-600 dark:data-[active=true]:text-emerald-400 data-[active=true]:border-emerald-500/40" },
  ];

  return (
    <div className="px-2 pb-2">
      <div className="rounded-lg border border-border bg-muted/30 p-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Eye className="w-3 h-3 text-muted-foreground" />
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            Vista de prueba (CEO)
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = view === opt.id;
            return (
              <Tooltip key={opt.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-active={active}
                    onClick={() => setView(opt.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-md border text-[10px] font-medium transition-all",
                      "border-transparent text-muted-foreground hover:bg-background",
                      opt.tone
                    )}
                    aria-pressed={active}
                    aria-label={`Ver CRM como ${opt.label}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="leading-none">{opt.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {opt.id === "real"
                    ? "Tu vista real como CEO"
                    : `Simular vista de ${opt.label.toLowerCase()} (sólo visual)`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {view !== "real" && (
          <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1.5 text-center leading-tight">
            ⚠️ Vista simulada activa
          </p>
        )}
      </div>
    </div>
  );
}
