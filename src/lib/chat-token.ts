/** Token persistente del visitante para la conversación de chat público. */
const KEY = "fsm_chat_token";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateChatToken(): string {
  if (typeof window === "undefined") return uuid();
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.length >= 16) return existing;
    const fresh = uuid();
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return uuid();
  }
}

export function resetChatToken(): string {
  if (typeof window === "undefined") return uuid();
  try {
    window.localStorage.removeItem(KEY);
  } catch {/* ignore */}
  return getOrCreateChatToken();
}
