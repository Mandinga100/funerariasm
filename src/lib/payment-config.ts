/**
 * Payment configuration — single source of truth for all payment flows.
 * Never hardcode amounts, plans, or bank data in components.
 */

export const BANK_DATA = {
  accountNumber: "1001612087",
  rut: "77846053K",
  bank: "Mercado Pago",
  accountType: "Vista",
  holder: "Funeraria Santa Margarita",
} as const;

export const PAYMENT_TYPES = {
  servicio: { label: "Pago de Servicio Funerario", icon: "Heart" },
  planificacion: { label: "Planificación Anticipada", icon: "Calendar" },
  donacion: { label: "Donación Legado Eterno", icon: "Flower2" },
} as const;

export type PaymentType = keyof typeof PAYMENT_TYPES;

export const SERVICE_SUBTYPES = [
  { id: "pago_total", label: "Pago total del servicio" },
  { id: "abono_inicial", label: "Abono inicial" },
  { id: "saldo_pendiente", label: "Saldo pendiente" },
  { id: "pago_caso", label: "Pago asociado a caso existente" },
] as const;

export const PLANS = [
  { id: "margarita", name: "Plan Margarita", price: 1290000, display: "$1.290.000" },
  { id: "azucena", name: "Plan Azucena", price: 1390000, display: "$1.390.000" },
  { id: "acacia", name: "Plan Acacia", price: 1990000, display: "$1.990.000" },
  { id: "orquidea", name: "Plan Orquídea", price: 1990000, display: "$1.990.000" },
  { id: "jazmin", name: "Plan Jazmín", price: 2790000, display: "$2.790.000" },
  { id: "castano", name: "Plan Castaño", price: 3990000, display: "$3.990.000" },
  { id: "rauli", name: "Plan Raulí", price: 3990000, display: "$3.990.000" },
] as const;

export const PLANIFICATION_SUBTYPES = [
  { id: "compra_anticipada", label: "Compra de plan anticipado" },
  { id: "reserva_abono", label: "Reserva con abono" },
  { id: "pago_total_plan", label: "Pago total del plan" },
] as const;

export const DONATION_AMOUNTS = [
  { value: 10000, label: "$10.000" },
  { value: 20000, label: "$20.000" },
  { value: 50000, label: "$50.000" },
  { value: 100000, label: "$100.000" },
] as const;

export const AMOUNT_LIMITS: Record<PaymentType, { min: number; max: number }> = {
  servicio: { min: 50000, max: 10000000 },
  planificacion: { min: 100000, max: 10000000 },
  donacion: { min: 1000, max: 5000000 },
};

export const TRANSACTION_STATUSES = {
  initiated: "Iniciada",
  transfer_reported: "Transferencia informada",
  proof_uploaded: "Comprobante enviado",
  pending_review: "En revisión",
  confirmed: "Confirmada",
  rejected: "Rechazada",
} as const;

export const ALLOWED_PROOF_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_PROOF_SIZE_MB = 5;
export const MAX_PROOF_SIZE_BYTES = MAX_PROOF_SIZE_MB * 1024 * 1024;

// RUT validation (Chile)
export function validateRut(rut: string): boolean {
  const clean = rut.replace(/[.\-]/g, "").toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const expected = 11 - (sum % 11);
  const dvExpected = expected === 11 ? "0" : expected === 10 ? "K" : String(expected);
  return dv === dvExpected;
}

export function formatClp(amount: number): string {
  return "$" + amount.toLocaleString("es-CL");
}
