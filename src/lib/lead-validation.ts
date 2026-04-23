/**
 * Validación inteligente de datos de contacto para leads.
 * Bloquea entradas falsas o incompletas ANTES de tocar la base de datos
 * y antes de notificar al equipo comercial.
 *
 * Reglas Chile:
 *  - Nombre: al menos 2 palabras (Nombre + Apellido), solo letras y espacios.
 *  - Teléfono: móvil chileno, normalizado a +569XXXXXXXX (8 dígitos tras el 9).
 *  - Email: dominio real de proveedores conocidos o dominio corporativo válido.
 */

export interface ValidationResult {
  ok: boolean;
  error?: string;
  /** Valor saneado/normalizado listo para guardar. */
  value?: string;
}

// ──────────────────────────── NOMBRE ────────────────────────────

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]+$/;

const FAKE_NAME_TOKENS = [
  "asd", "qwe", "test", "prueba", "aaa", "xxx", "abc", "zzz",
  "nada", "ninguno", "anonimo", "anónimo", "fulano", "ejemplo",
];

export function validateFullName(input: string): ValidationResult {
  const value = (input ?? "").trim().replace(/\s+/g, " ");
  if (!value) return { ok: false, error: "Por favor ingrese su nombre completo." };
  if (value.length < 5) return { ok: false, error: "El nombre es demasiado corto. Ingrese nombre y apellido (ej: María González)." };
  if (value.length > 80) return { ok: false, error: "El nombre es demasiado largo. Use máximo 80 caracteres." };

  if (!NAME_REGEX.test(value)) {
    return { ok: false, error: "El nombre solo debe contener letras y espacios. Sin números ni símbolos." };
  }

  const parts = value.split(" ").filter((p) => p.length >= 2);
  if (parts.length < 2) {
    return { ok: false, error: "Ingrese nombre y apellido completos (ej: Daniel Misle)." };
  }

  const lower = value.toLowerCase();
  if (FAKE_NAME_TOKENS.some((t) => lower === t || lower.startsWith(t + " ") || lower.endsWith(" " + t))) {
    return { ok: false, error: "El nombre no parece real. Por favor ingrese su nombre verdadero." };
  }

  // Detecta repeticiones tipo "aaaa" o "jjjj"
  if (/(.)\1{3,}/.test(lower.replace(/\s/g, ""))) {
    return { ok: false, error: "El nombre contiene caracteres repetidos. Verifique e intente de nuevo." };
  }

  return { ok: true, value };
}

// ──────────────────────────── TELÉFONO ────────────────────────────

/**
 * Normaliza un teléfono chileno a formato E.164 +569XXXXXXXX.
 * Acepta variantes: 9 1234 5678 / +56912345678 / 56912345678 / 912345678.
 */
export function validateChileanPhone(input: string): ValidationResult {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Por favor ingrese su número de teléfono." };

  // Quita todo lo que no sea dígito o '+'
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = "+" + digits.slice(1).replace(/\+/g, "");

  // Convierte a forma sin '+' para evaluar largo
  let normalized = digits.startsWith("+") ? digits.slice(1) : digits;

  // Caso 1: empieza con 56 (código país)
  if (normalized.startsWith("56")) {
    normalized = normalized.slice(2);
  }

  // En este punto debe ser 9XXXXXXXX (9 dígitos, partiendo en 9)
  if (normalized.length !== 9) {
    return { ok: false, error: "El teléfono debe tener 9 dígitos (ej: +56 9 6166 1474). Verifique e intente nuevamente." };
  }

  if (!normalized.startsWith("9")) {
    return { ok: false, error: "Solo aceptamos celulares chilenos. Debe comenzar con 9 (ej: +56 9 6166 1474)." };
  }

  // Detecta secuencias obviamente falsas: todos iguales, ascendente, descendente
  const tail = normalized.slice(1); // 8 dígitos tras el 9
  if (/^(\d)\1{7}$/.test(tail)) {
    return { ok: false, error: "El número parece inválido (dígitos repetidos). Por favor verifique." };
  }
  if (tail === "12345678" || tail === "87654321" || tail === "00000000") {
    return { ok: false, error: "El número no es válido. Por favor ingrese su teléfono real." };
  }

  return { ok: true, value: `+56${normalized}` };
}

// ──────────────────────────── EMAIL ────────────────────────────

const KNOWN_EMAIL_DOMAINS = new Set([
  "gmail.com", "hotmail.com", "outlook.com", "outlook.es", "outlook.cl",
  "yahoo.com", "yahoo.es", "yahoo.cl", "live.com", "live.cl",
  "icloud.com", "me.com", "protonmail.com", "proton.me",
  "uc.cl", "usach.cl", "uchile.cl", "udp.cl", "uai.cl", "uandes.cl",
  "duoc.cl", "inacap.cl",
  "vtr.net", "movistar.cl", "entel.cl", "claro.cl",
]);

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateEmail(input: string, opts: { required?: boolean } = {}): ValidationResult {
  const value = (input ?? "").trim().toLowerCase();
  if (!value) {
    if (opts.required) return { ok: false, error: "Por favor ingrese su correo electrónico." };
    return { ok: true, value: "" };
  }

  if (value.length > 100) return { ok: false, error: "El correo es demasiado largo." };

  if (!EMAIL_REGEX.test(value)) {
    return { ok: false, error: "El correo no tiene un formato válido (ej: nombre@gmail.com)." };
  }

  const domain = value.split("@")[1];
  if (!domain) return { ok: false, error: "El correo está incompleto." };

  // Verifica TLD razonable (2-6 letras)
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2 || tld.length > 6) {
    return { ok: false, error: "El dominio del correo no parece válido." };
  }

  // Aceptamos dominios conocidos directo, o dominios .cl/.com con estructura razonable
  if (KNOWN_EMAIL_DOMAINS.has(domain)) return { ok: true, value };

  // Acepta dominios corporativos plausibles: al menos 4 chars + TLD válido
  const allowedTlds = new Set(["com", "cl", "org", "net", "co", "io", "edu", "gob"]);
  const baseTld = tld;
  if (allowedTlds.has(baseTld) && domain.length >= 5) {
    return { ok: true, value };
  }

  return {
    ok: false,
    error: "Use un correo válido (ej: @gmail.com, @hotmail.com, @outlook.com).",
  };
}
