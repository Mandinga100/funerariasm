import { useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  SERVICE_CATALOG,
  getServiceTypeDef,
  getOptionPrice,
  type ServiceTypeId,
} from "@/lib/service-catalog";
import { formatClp } from "@/lib/payment-config";
import { CheckCircle2, Info } from "lucide-react";

interface ServiceSelectorProps {
  serviceType: string;
  serviceOption: string | null;
  amount: string;
  onServiceTypeChange: (v: ServiceTypeId) => void;
  onServiceOptionChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  amountLabel?: string;
  /** Si true, muestra los selectores en una sola columna (compacto) */
  compact?: boolean;
}

/**
 * Selector unificado: Tipo de Servicio → Opción/Plan → Monto auto-rellenado.
 * Reutilizable en Leads, Casos y demás módulos del CRM.
 */
export default function ServiceSelector({
  serviceType,
  serviceOption,
  amount,
  onServiceTypeChange,
  onServiceOptionChange,
  onAmountChange,
  amountLabel = "Monto Total (CLP)",
  compact = false,
}: ServiceSelectorProps) {
  const def = useMemo(() => getServiceTypeDef(serviceType), [serviceType]);
  const expectedPrice = getOptionPrice(serviceType, serviceOption);
  const numericAmount = parseInt(amount) || 0;
  const matchesCatalog = expectedPrice > 0 && numericAmount === expectedPrice;

  // Auto-llenar monto cuando cambia la opción y tiene precio fijo
  useEffect(() => {
    if (expectedPrice > 0) {
      onAmountChange(String(expectedPrice));
    }
    // solo cuando cambia la opción seleccionada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceOption, serviceType]);

  return (
    <div className={compact ? "space-y-3" : "space-y-3"}>
      <div className={compact ? "space-y-3" : "grid grid-cols-2 gap-3"}>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tipo de Servicio</label>
          <Select
            value={serviceType}
            onValueChange={(v) => {
              onServiceTypeChange(v as ServiceTypeId);
              onServiceOptionChange(""); // reset opción al cambiar tipo
            }}
          >
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue placeholder="Seleccionar tipo…" /></SelectTrigger>
            <SelectContent>
              {SERVICE_CATALOG.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {def?.optionLabel ?? "Servicio específico"}
          </label>
          <Select
            value={serviceOption ?? ""}
            onValueChange={onServiceOptionChange}
            disabled={!def}
          >
            <SelectTrigger className="h-8 text-xs mt-1">
              <SelectValue placeholder={def ? "Seleccionar…" : "Elige tipo primero"} />
            </SelectTrigger>
            <SelectContent>
              {def?.options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  <span className="flex items-center justify-between gap-3 w-full">
                    <span>{o.label}</span>
                    {o.price > 0 && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">{formatClp(o.price)}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          {amountLabel}
          {matchesCatalog && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" />Precio catálogo
            </Badge>
          )}
        </label>
        <Input
          type="number"
          className="h-8 text-xs mt-1"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="$0"
        />
        {numericAmount > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
            {formatClp(numericAmount)}
            {expectedPrice > 0 && numericAmount !== expectedPrice && (
              <span className="ml-2 text-amber-600 inline-flex items-center gap-0.5">
                <Info className="w-2.5 h-2.5" />
                Difiere del catálogo ({formatClp(expectedPrice)})
              </span>
            )}
          </p>
        )}
        {expectedPrice === 0 && serviceOption && (
          <p className="text-[10px] text-muted-foreground mt-0.5 italic">
            Sin precio fijo — ingresar monto manualmente.
          </p>
        )}
      </div>
    </div>
  );
}
