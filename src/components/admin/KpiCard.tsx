import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconClassName?: string;
  /** Si se entrega, la tarjeta es clicable y abre el modal. */
  onClick?: () => void;
  /** Visual hint cuando es clicable. */
  hint?: string;
  /** Tamaño del valor. */
  valueSize?: "lg" | "md";
  className?: string;
  /** Color del borde inferior (ej "border-primary"). */
  accentClassName?: string;
}

/**
 * Tarjeta KPI estandarizada para los dashboards del admin.
 * Cuando recibe onClick se vuelve clicable con feedback visual + role=button.
 */
export default function KpiCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  onClick,
  hint,
  valueSize = "lg",
  className,
  accentClassName,
}: KpiCardProps) {
  const interactive = !!onClick;
  return (
    <Card
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden transition-all",
        interactive &&
          "cursor-pointer hover:shadow-md hover:border-primary/40 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {accentClassName && (
        <span className={cn("absolute inset-x-0 bottom-0 h-0.5", accentClassName)} aria-hidden />
      )}
      <CardContent className="p-3 lg:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] lg:text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </p>
            <p
              className={cn(
                "font-bold tabular-nums leading-tight mt-1",
                valueSize === "lg" ? "text-2xl" : "text-xl",
              )}
            >
              {value}
            </p>
            {hint && (
              <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                {interactive ? `→ ${hint}` : hint}
              </p>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                "shrink-0 rounded-md p-1.5 bg-muted/40",
                iconClassName,
              )}
            >
              <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
