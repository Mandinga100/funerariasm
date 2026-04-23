const WHATSAPP_NUMBER = "56964333760";

export type ContactIntent =
  | "fallecimiento"
  | "cotizacion"
  | "planificacion"
  | "cremacion"
  | "traslado"
  | "obituario"
  | "memorial"
  | "general";

interface WhatsAppMessageParams {
  intent: ContactIntent;
  name?: string;
  phone?: string;
  email?: string;
  comuna?: string;
  selectedPlan?: string;
  details?: string;
}

const INTENT_TEMPLATES: Record<ContactIntent, (p: WhatsAppMessageParams) => string> = {
  fallecimiento: (p) =>
    `URGENTE — Necesito asistencia inmediata por un fallecimiento reciente.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.comuna ? `\nUbicación: ${p.comuna}.` : ""}${
      p.phone ? `\nTeléfono de contacto: ${p.phone}` : ""
    }\nNecesito orientación sobre los pasos a seguir.`,

  cotizacion: (p) =>
    `Hola, me gustaría cotizar un servicio funerario.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.selectedPlan ? `\nMe interesa el ${p.selectedPlan}.` : ""}${
      p.comuna ? `\nComuna: ${p.comuna}.` : ""
    }${p.details ? `\nDetalle: ${p.details}` : ""}\n¿Podrían orientarme con las opciones disponibles?`,

  planificacion: (p) =>
    `Hola, me gustaría planificar un servicio funerario de manera preventiva.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.selectedPlan ? `\nMe interesa conocer el ${p.selectedPlan}.` : ""}\n¿Podrían agendar una asesoría personalizada?`,

  cremacion: (p) =>
    `Hola, necesito información sobre sus servicios de cremación.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.details ? `\nConsulta: ${p.details}` : ""}\n¿Podrían explicarme el proceso y costos?`,

  traslado: (p) =>
    `Hola, necesito coordinar un traslado funerario.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.comuna ? `\nDesde/hacia: ${p.comuna}.` : ""}${
      p.details ? `\nDetalle: ${p.details}` : ""
    }\n¿Pueden orientarme?`,

  obituario: (p) =>
    `Hola, tengo una consulta sobre obituarios en su sitio web.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.details ? `\nConsulta: ${p.details}` : ""}`,

  memorial: (p) =>
    `Hola, me gustaría información sobre memoriales virtuales.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.details ? `\nConsulta: ${p.details}` : ""}`,

  general: (p) =>
    `Hola, me comunico desde su sitio web.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.details ? `\n${p.details}` : ""}\n¿Podrían orientarme?`,
};

export const buildWhatsAppMessage = (params: WhatsAppMessageParams): string => {
  const template = INTENT_TEMPLATES[params.intent] || INTENT_TEMPLATES.general;
  return template(params);
};

export const buildWhatsAppUrl = (params: WhatsAppMessageParams): string => {
  const message = buildWhatsAppMessage(params);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

export const buildWhatsAppUrlDirect = (message: string): string =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/**
 * Resultado detallado de validación de teléfono chileno.
 * - ok=true → number tiene formato wa.me (E.164 sin '+').
 * - ok=false → reason describe el problema para mostrar al usuario.
 */
export type PhoneValidation =
  | { ok: true; number: string; pretty: string; isMobile: boolean }
  | { ok: false; reason: string };

/**
 * Formatea un teléfono CL en formato legible: +56 9 1234 5678 / +56 2 2345 6789.
 */
export const prettyClPhone = (e164: string): string => {
  if (e164.length === 11 && e164.startsWith("569")) {
    return `+56 9 ${e164.slice(3, 7)} ${e164.slice(7)}`;
  }
  if (e164.length === 11 && e164.startsWith("56")) {
    return `+56 ${e164.slice(2, 3)} ${e164.slice(3, 7)} ${e164.slice(7)}`;
  }
  return `+${e164}`;
};

/**
 * Valida y normaliza un teléfono chileno con razón de error específica.
 * Reglas:
 *  - Móvil CL: 9 dígitos comenzando con 9  → 569XXXXXXXX (11 dígitos)
 *  - Fijo CL:  8 dígitos                   → 56XXXXXXXX  (10 dígitos, no contactable WhatsApp)
 *  - Acepta prefijos +56 / 56 / 0056.
 *  - Rechaza dígitos repetidos triviales (000000000, 999999999).
 */
export const validateClPhone = (raw?: string | null): PhoneValidation => {
  if (!raw || !raw.trim()) {
    return { ok: false, reason: "No se ha registrado un número de teléfono." };
  }
  let d = raw.replace(/\D/g, "");
  if (!d) return { ok: false, reason: "El teléfono no contiene dígitos válidos." };
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("56")) d = d.slice(2);

  // Trivial: todos iguales
  if (/^(\d)\1+$/.test(d)) {
    return { ok: false, reason: "El número parece inválido (dígitos repetidos)." };
  }

  // Móvil chileno
  if (d.length === 9 && d.startsWith("9")) {
    const number = "56" + d;
    return { ok: true, number, pretty: prettyClPhone(number), isMobile: true };
  }
  // Móvil sin el 9 inicial (8 dígitos asumiendo móvil viejo) → asumimos fijo
  if (d.length === 8) {
    return {
      ok: false,
      reason: "El número parece de teléfono fijo (8 dígitos). WhatsApp solo contacta móviles que comienzan con 9.",
    };
  }
  if (d.length < 9) {
    return { ok: false, reason: `Faltan dígitos (${d.length}/9). Un móvil chileno tiene 9 dígitos comenzando con 9.` };
  }
  if (d.length > 9) {
    return { ok: false, reason: "El número tiene demasiados dígitos para un móvil chileno." };
  }
  return { ok: false, reason: "Formato no reconocido. Usa un móvil chileno: 9 XXXX XXXX." };
};

/**
 * Compatibilidad retro: devuelve el E.164 sin '+' o null.
 */
export const normalizeClPhone = (raw?: string | null): string | null => {
  const v = validateClPhone(raw);
  return v.ok ? v.number : null;
};

/**
 * Limpia y formatea un nombre: trim, colapsa espacios, capitaliza por palabra,
 * descarta caracteres extraños y limita a 80 chars.
 */
export const formatPersonName = (raw?: string | null): string => {
  if (!raw) return "";
  const cleaned = raw
    .replace(/[^\p{L}\p{M}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!cleaned) return "";
  return cleaned
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
};

/**
 * Devuelve el primer nombre formateado, o cadena vacía.
 */
export const firstName = (raw?: string | null): string => {
  const full = formatPersonName(raw);
  return full ? full.split(" ")[0] : "";
};

/**
 * Construye URL wa.me hacia un destinatario externo (cliente/lead).
 */
export const buildWhatsAppUrlTo = (phone: string, message: string): string =>
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

/**
 * Abre WhatsApp en una nueva pestaña/ventana sin requerir API.
 * Funciona con WhatsApp Web (desktop) y app móvil. Sin fricción.
 * Devuelve true si pudo abrir, false si fue bloqueado por el navegador.
 */
export const openWhatsAppChat = (phone: string, message: string): boolean => {
  const url = buildWhatsAppUrlTo(phone, message);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win) return true;
  // Fallback: anchor click (sortea bloqueos en algunos iframes)
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return false;
};

export { WHATSAPP_NUMBER };
