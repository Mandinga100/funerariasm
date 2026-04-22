import { useCallback, useEffect, useState } from "react";

/**
 * Hook centralizado para el tema del CRM admin.
 * - Persistencia en localStorage ("crm_theme")
 * - Soporte para "light" | "dark" | "system" (sigue prefers-color-scheme)
 * - Aplica/quita clase `dark` en <html> de forma consistente
 * - Sincroniza entre pestañas (storage event)
 * - Reacciona a cambios en la preferencia del SO cuando theme === "system"
 *
 * Fuente única de verdad: cualquier consumidor lee/escribe via este hook,
 * evitando inconsistencias y "dark" hardcoded en componentes.
 */
export type AdminTheme = "light" | "dark" | "system";

const STORAGE_KEY = "crm_theme";

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredTheme(): AdminTheme {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function applyTheme(theme: AdminTheme) {
  if (typeof document === "undefined") return;
  const effective = theme === "system" ? getSystemPreference() : theme;
  document.documentElement.classList.toggle("dark", effective === "dark");
  document.documentElement.style.colorScheme = effective;
}

export function useAdminTheme() {
  const [theme, setThemeState] = useState<AdminTheme>(() => readStoredTheme());

  // Aplica el tema al montar y cada vez que cambie
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage puede estar deshabilitado */
    }
  }, [theme]);

  // Sigue cambios del sistema cuando theme === "system"
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Sincroniza entre pestañas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = (e.newValue as AdminTheme) ?? "system";
      if (next === "light" || next === "dark" || next === "system") {
        setThemeState(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next);
  }, []);

  const effective: "light" | "dark" = theme === "system" ? getSystemPreference() : theme;

  return { theme, effective, setTheme };
}

/**
 * Aplica el tema almacenado lo antes posible (antes del primer render).
 * Llamar al montar AdminLayout para evitar flash del tema incorrecto.
 */
export function bootstrapAdminTheme() {
  applyTheme(readStoredTheme());
}
