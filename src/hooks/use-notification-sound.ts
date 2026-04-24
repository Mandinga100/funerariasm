// Preferencias de audio de notificación (persistidas en localStorage)
// Volumen 0..1 (default 0.6); tono normal y patrón urgente ajustables.

const KEY_ENABLED = "admin_notification_sound";
const KEY_VOLUME = "admin_notification_volume";
const KEY_TONE_NORMAL = "admin_notification_tone_normal";
const KEY_TONE_URGENT = "admin_notification_tone_urgent";

export type NormalTone = "soft" | "ping" | "chime";
export type UrgentTone = "alarm" | "siren" | "pulse";

export const getSoundEnabled = (): boolean =>
  typeof window === "undefined" ? true : localStorage.getItem(KEY_ENABLED) !== "false";

export const getVolume = (): number => {
  if (typeof window === "undefined") return 0.6;
  const raw = localStorage.getItem(KEY_VOLUME);
  const n = raw ? parseFloat(raw) : 0.6;
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.6;
};

export const getNormalTone = (): NormalTone => {
  if (typeof window === "undefined") return "soft";
  const v = (localStorage.getItem(KEY_TONE_NORMAL) ?? "soft") as NormalTone;
  return ["soft", "ping", "chime"].includes(v) ? v : "soft";
};

export const getUrgentTone = (): UrgentTone => {
  if (typeof window === "undefined") return "alarm";
  const v = (localStorage.getItem(KEY_TONE_URGENT) ?? "alarm") as UrgentTone;
  return ["alarm", "siren", "pulse"].includes(v) ? v : "alarm";
};

export const setSoundEnabled = (v: boolean) => localStorage.setItem(KEY_ENABLED, String(v));
export const setVolume = (v: number) => localStorage.setItem(KEY_VOLUME, String(Math.min(1, Math.max(0, v))));
export const setNormalTone = (v: NormalTone) => localStorage.setItem(KEY_TONE_NORMAL, v);
export const setUrgentTone = (v: UrgentTone) => localStorage.setItem(KEY_TONE_URGENT, v);

type ToneSpec = { freq: number; start: number; dur: number; type?: OscillatorType };

const NORMAL_PRESETS: Record<NormalTone, ToneSpec[]> = {
  soft: [{ freq: 880, start: 0, dur: 0.5, type: "sine" }],
  ping: [
    { freq: 1320, start: 0, dur: 0.12, type: "sine" },
    { freq: 1760, start: 0.14, dur: 0.18, type: "sine" },
  ],
  chime: [
    { freq: 660, start: 0, dur: 0.18, type: "triangle" },
    { freq: 880, start: 0.2, dur: 0.18, type: "triangle" },
    { freq: 1320, start: 0.4, dur: 0.3, type: "triangle" },
  ],
};

const URGENT_PRESETS: Record<UrgentTone, ToneSpec[]> = {
  alarm: [
    { freq: 880, start: 0, dur: 0.15, type: "triangle" },
    { freq: 1100, start: 0.18, dur: 0.15, type: "triangle" },
    { freq: 1320, start: 0.36, dur: 0.25, type: "triangle" },
  ],
  siren: [
    { freq: 600, start: 0, dur: 0.3, type: "sawtooth" },
    { freq: 1000, start: 0.32, dur: 0.3, type: "sawtooth" },
    { freq: 600, start: 0.64, dur: 0.3, type: "sawtooth" },
    { freq: 1000, start: 0.96, dur: 0.3, type: "sawtooth" },
  ],
  pulse: [
    { freq: 1000, start: 0, dur: 0.1, type: "square" },
    { freq: 1000, start: 0.18, dur: 0.1, type: "square" },
    { freq: 1000, start: 0.36, dur: 0.1, type: "square" },
    { freq: 1400, start: 0.54, dur: 0.2, type: "square" },
  ],
};

const playTones = (tones: ToneSpec[], volume: number) => {
  if (volume <= 0) return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    tones.forEach(({ freq, start, dur, type = "sine" }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = type;
      // Pico en función del volumen (max 0.5 absoluto para no saturar)
      gain.gain.setValueAtTime(Math.max(0.001, volume * 0.5), now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
    // Auto-cleanup
    setTimeout(() => {
      try { void ctx.close(); } catch { /* noop */ }
    }, (tones[tones.length - 1].start + tones[tones.length - 1].dur + 0.3) * 1000);
  } catch {
    // AudioContext not available
  }
};

const beep = (override?: { volume?: number; tone?: NormalTone }) => {
  if (!getSoundEnabled() && !override) return;
  const vol = override?.volume ?? getVolume();
  const tone = override?.tone ?? getNormalTone();
  playTones(NORMAL_PRESETS[tone], vol);
};

const urgentAlarm = (override?: { volume?: number; tone?: UrgentTone }) => {
  if (!getSoundEnabled() && !override) return;
  const vol = override?.volume ?? getVolume();
  const tone = override?.tone ?? getUrgentTone();
  const tones = URGENT_PRESETS[tone];
  playTones(tones, vol);
  // Repetir patrón completo una vez para reforzar urgencia
  const totalMs = (tones[tones.length - 1].start + tones[tones.length - 1].dur + 0.2) * 1000;
  setTimeout(() => playTones(tones, vol * 0.85), totalMs + 200);
};

export function useNotificationSound() {
  return { playNotification: beep, playUrgentAlert: urgentAlarm };
}
