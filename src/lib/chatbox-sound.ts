/**
 * Sonido + vibración para el chatbox público (lado visitante).
 *
 * Independiente de `use-notification-sound` (que es del CRM y depende de
 * preferencias por usuario autenticado). Aquí solo persistimos un mute
 * por dominio en localStorage, sin requerir login.
 */

const KEY_MUTED = "chatbox_visitor_muted";

export function isChatboxMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY_MUTED) === "1";
}

export function setChatboxMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  if (muted) localStorage.setItem(KEY_MUTED, "1");
  else localStorage.removeItem(KEY_MUTED);
}

/**
 * Tono breve, suave y profesional (dos notas en triángulo) con pequeña
 * envolvente para no resultar invasivo. Adecuado para llegada de mensaje
 * de un asesor humano en un contexto sensible (funeraria).
 */
export function playChatboxNotification(): void {
  if (isChatboxMuted()) return;
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const tones: Array<{ freq: number; start: number; dur: number }> = [
      { freq: 880, start: 0, dur: 0.18 },
      { freq: 1175, start: 0.16, dur: 0.22 },
    ];
    tones.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
    setTimeout(() => { try { void ctx.close(); } catch { /* noop */ } }, 800);
  } catch {
    /* AudioContext bloqueado: silencioso, no afecta UX */
  }
}

export function vibrateChatbox(): void {
  if (isChatboxMuted()) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate([80, 40, 80]);
  } catch { /* noop */ }
}

export function notifyChatboxInbound(): void {
  playChatboxNotification();
  vibrateChatbox();
}
