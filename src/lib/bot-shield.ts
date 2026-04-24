/**
 * Bot Shield — defensa anti-spam ligera y reutilizable para formularios públicos.
 *
 * Tres capas:
 *  1. Honeypot: un input invisible (display:none + tabIndex=-1 + aria-hidden) que los bots
 *     suelen rellenar. Si llega con valor → se rechaza el envío silenciosamente.
 *  2. Timing: se mide cuánto tarda el usuario entre cargar el formulario y enviarlo.
 *     Bots envían en milisegundos; humanos demoran segundos. Si es < MIN_FILL_MS → rechazo.
 *  3. Throttle por sesión: máximo N envíos del mismo formulario por ventana en localStorage.
 *     Estricto por defecto (3 envíos / 15 min).
 *
 * Esto NO es un rate-limit por IP real (Lovable Cloud no tiene primitiva). Es defensa
 * en profundidad complementaria a las validaciones RLS y a la deduplicación server-side.
 */
const MIN_FILL_MS = 1500; // < 1.5s ⇒ probablemente bot
const THROTTLE_MAX = 3;   // máx 3 envíos por ventana
const THROTTLE_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

const STORAGE_PREFIX = "bot_shield:";
const SUSPICION_PREFIX = "bot_shield_susp:";
/**
 * A partir de este número de señales sospechosas (honeypot/too_fast/throttled)
 * en la ventana, exigimos un challenge tipo captcha antes de permitir el envío.
 */
const SUSPICION_THRESHOLD = 2;
const SUSPICION_WINDOW_MS = 30 * 60 * 1000; // 30 minutos
const CHALLENGE_PASS_TTL_MS = 10 * 60 * 1000; // un pase válido durante 10 min

/** Crea un timestamp inicial al montar el formulario. */
export function createShieldTimer(): number {
  return Date.now();
}

interface ShieldCheckInput {
  /** Valor del honeypot (debe venir vacío). */
  honeypot: string;
  /** Timestamp creado en el mount del formulario. */
  startedAt: number;
  /** Identificador único del formulario (para throttle por separado). */
  formKey: string;
  /**
   * Si el usuario ya resolvió el challenge en esta sesión, omite la exigencia
   * por tiempo limitado (ver `CHALLENGE_PASS_TTL_MS`).
   */
  challengePassed?: boolean;
}

interface ShieldResult {
  ok: boolean;
  reason?: "honeypot" | "too_fast" | "throttled" | "challenge_required";
  /** Mensaje legible para mostrar al usuario (en español). */
  message?: string;
  /** True cuando el usuario debe resolver un captcha antes de reintentar. */
  requiresChallenge?: boolean;
}

// ---------- Suspicion tracking ----------

function readSuspicionHits(formKey: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SUSPICION_PREFIX + formKey);
    const now = Date.now();
    const hits: number[] = raw ? JSON.parse(raw) : [];
    return hits.filter((t) => now - t < SUSPICION_WINDOW_MS);
  } catch {
    return [];
  }
}

function recordSuspicion(formKey: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const recent = readSuspicionHits(formKey);
    recent.push(Date.now());
    window.localStorage.setItem(SUSPICION_PREFIX + formKey, JSON.stringify(recent));
    return recent.length;
  } catch {
    return 0;
  }
}

/** ¿Hay suficientes señales sospechosas para exigir captcha? */
export function shouldRequireChallenge(formKey: string): boolean {
  return readSuspicionHits(formKey).length >= SUSPICION_THRESHOLD;
}

const challengePassKey = (formKey: string) => `bot_shield_pass:${formKey}`;

/** Marca el challenge como resuelto por un tiempo limitado. */
export function markChallengePassed(formKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      challengePassKey(formKey),
      String(Date.now() + CHALLENGE_PASS_TTL_MS),
    );
  } catch {
    // ignore
  }
}

/** ¿El pase de challenge sigue vigente? */
export function hasValidChallengePass(formKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(challengePassKey(formKey));
    if (!raw) return false;
    return Number(raw) > Date.now();
  } catch {
    return false;
  }
}

/** Ejecuta las tres capas de defensa antes de enviar. */
export function checkBotShield({
  honeypot,
  startedAt,
  formKey,
  challengePassed,
}: ShieldCheckInput): ShieldResult {
  // 0. Si ya hay sospechas acumuladas, exigimos challenge salvo que tenga pase válido.
  const challengeNeeded =
    shouldRequireChallenge(formKey) && !(challengePassed || hasValidChallengePass(formKey));
  if (challengeNeeded) {
    return {
      ok: false,
      reason: "challenge_required",
      requiresChallenge: true,
      message: "Por favor confirme que no es un robot antes de continuar.",
    };
  }

  // 1. Honeypot
  if (honeypot && honeypot.trim().length > 0) {
    const count = recordSuspicion(formKey);
    return {
      ok: false,
      reason: "honeypot",
      requiresChallenge: count >= SUSPICION_THRESHOLD,
      message: "Envío bloqueado por motivos de seguridad.",
    };
  }

  // 2. Timing
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_FILL_MS) {
    const count = recordSuspicion(formKey);
    return {
      ok: false,
      reason: "too_fast",
      requiresChallenge: count >= SUSPICION_THRESHOLD,
      message: "Por favor revise el formulario antes de enviarlo.",
    };
  }

  // 3. Throttle por sesión
  if (typeof window !== "undefined") {
    try {
      const key = STORAGE_PREFIX + formKey;
      const raw = window.localStorage.getItem(key);
      const now = Date.now();
      const hits: number[] = raw ? JSON.parse(raw) : [];
      const recent = hits.filter((t) => now - t < THROTTLE_WINDOW_MS);
      if (recent.length >= THROTTLE_MAX) {
        const count = recordSuspicion(formKey);
        return {
          ok: false,
          reason: "throttled",
          requiresChallenge: count >= SUSPICION_THRESHOLD,
          message: "Ha enviado demasiados formularios. Intente nuevamente en unos minutos.",
        };
      }
    } catch {
      // localStorage no disponible (modo privado, etc.) → no bloqueamos.
    }
  }

  return { ok: true };
}

/** Registra un envío exitoso en el throttle por sesión. Llamar tras un insert OK. */
export function registerShieldHit(formKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const key = STORAGE_PREFIX + formKey;
    const raw = window.localStorage.getItem(key);
    const now = Date.now();
    const hits: number[] = raw ? JSON.parse(raw) : [];
    const recent = hits.filter((t) => now - t < THROTTLE_WINDOW_MS);
    recent.push(now);
    window.localStorage.setItem(key, JSON.stringify(recent));
  } catch {
    // ignore
  }
}

/**
 * Props estilísticos para el input honeypot.
 * Uso:
 *   <input {...honeypotInputProps} value={hp} onChange={(e) => setHp(e.target.value)} />
 */
export const honeypotInputProps = {
  type: "text" as const,
  name: "website",
  autoComplete: "off",
  tabIndex: -1,
  "aria-hidden": true,
  style: {
    position: "absolute" as const,
    left: "-9999px",
    width: "1px",
    height: "1px",
    opacity: 0,
    pointerEvents: "none" as const,
  },
};
