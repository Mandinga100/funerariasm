/**
 * Catálogo unificado de tipos de servicio y sus opciones con precios.
 * Fuente única de verdad para selectores en Leads, Casos y demás módulos.
 * Los precios se sincronizan con payment-config.ts y catalogo.json (web).
 */

import { PLANS } from "./payment-config";

export type ServiceTypeId =
  | "servicio_funerario"
  | "cremacion"
  | "traslado"
  | "prevision"
  | "memorial";

export interface ServiceOption {
  /** ID estable que se guarda en BD (campo selected_plan / metadata) */
  id: string;
  /** Etiqueta visible */
  label: string;
  /** Precio referencial en CLP. 0 = "a cotizar" */
  price: number;
  /** Texto auxiliar opcional (ej: "desde", "incluye urna") */
  hint?: string;
}

export interface ServiceTypeDef {
  id: ServiceTypeId;
  label: string;
  /** Etiqueta del segundo selector (qué se eligió dentro de este tipo) */
  optionLabel: string;
  options: ServiceOption[];
  /** Si true, el monto siempre es manual (no hay precio fijo) */
  customAmount?: boolean;
}

// Planes funerarios (sincronizados con payment-config.ts)
const FUNERAL_PLAN_OPTIONS: ServiceOption[] = PLANS.map((p) => ({
  id: p.id,
  label: p.name,
  price: p.price,
}));

export const SERVICE_CATALOG: ServiceTypeDef[] = [
  {
    id: "servicio_funerario",
    label: "Servicio Funerario",
    optionLabel: "Plan Funerario",
    options: [
      ...FUNERAL_PLAN_OPTIONS,
      { id: "servicio_personalizado", label: "Servicio personalizado (a cotizar)", price: 0 },
    ],
  },
  {
    id: "cremacion",
    label: "Cremación",
    optionLabel: "Modalidad de Cremación",
    options: [
      { id: "cremacion_directa", label: "Cremación directa", price: 890000 },
      { id: "cremacion_con_velatorio", label: "Cremación con velatorio", price: 1490000 },
      { id: "cremacion_premium", label: "Cremación premium con ceremonia", price: 1990000 },
    ],
  },
  {
    id: "traslado",
    label: "Traslado",
    optionLabel: "Tipo de Traslado",
    options: [
      { id: "traslado_rm", label: "Traslado dentro de la RM", price: 250000 },
      { id: "traslado_regional", label: "Traslado regional", price: 450000 },
      { id: "traslado_internacional", label: "Traslado internacional (a cotizar)", price: 0 },
    ],
  },
  {
    id: "prevision",
    label: "Previsión Funeraria",
    optionLabel: "Plan de Previsión",
    options: [
      ...FUNERAL_PLAN_OPTIONS,
      { id: "prevision_personalizada", label: "Previsión personalizada (a cotizar)", price: 0 },
    ],
  },
  {
    id: "memorial",
    label: "Memorial / Legado",
    optionLabel: "Tipo de Memorial",
    options: [
      { id: "memorial_basico", label: "Memorial básico digital", price: 0 },
      { id: "memorial_legado", label: "Memorial Legado Eterno", price: 150000 },
      { id: "memorial_premium", label: "Memorial premium con QR físico", price: 290000 },
    ],
  },
];

export function getServiceTypeDef(id?: string | null): ServiceTypeDef | undefined {
  if (!id) return undefined;
  return SERVICE_CATALOG.find((s) => s.id === id);
}

export function getServiceOption(typeId?: string | null, optionId?: string | null): ServiceOption | undefined {
  const def = getServiceTypeDef(typeId);
  if (!def || !optionId) return undefined;
  return def.options.find((o) => o.id === optionId);
}

export function getOptionPrice(typeId?: string | null, optionId?: string | null): number {
  return getServiceOption(typeId, optionId)?.price ?? 0;
}

export const SERVICE_TYPE_OPTIONS = SERVICE_CATALOG.map((s) => ({ id: s.id, label: s.label }));
