import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Vista simulada de rol para que el CEO pueda comprobar cómo se ve el CRM
 * desde la perspectiva de un Administrador o Moderador, sin perder sus
 * privilegios reales (sólo afecta `effectiveIsCeo`/`effectiveIsAdmin`/`effectiveRole`).
 */
export type RoleView = "real" | "admin" | "moderator";

interface RoleViewContextValue {
  /** Vista actualmente seleccionada por el CEO (persistida en sessionStorage). */
  view: RoleView;
  setView: (v: RoleView) => void;
  /** True sólo si el usuario es CEO real (puede cambiar la vista). */
  canSwitch: boolean;
  /** isCeo efectivo, ya descontando la simulación. */
  effectiveIsCeo: boolean;
  /** isAdmin efectivo (ceo o admin), ya descontando la simulación. */
  effectiveIsAdmin: boolean;
  /** Etiqueta legible del rol efectivo. */
  effectiveRoleLabel: string;
}

const RoleViewContext = createContext<RoleViewContextValue | undefined>(undefined);

const STORAGE_KEY = "admin_role_view";

export function RoleViewProvider({ children }: { children: ReactNode }) {
  const { isCeo, isAdmin } = useAuth();
  const [view, setViewState] = useState<RoleView>("real");

  // Hidratar desde sessionStorage (sólo si es CEO real, para evitar persistencia indebida).
  useEffect(() => {
    if (!isCeo) {
      setViewState("real");
      return;
    }
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) as RoleView | null;
      if (stored === "admin" || stored === "moderator" || stored === "real") {
        setViewState(stored);
      }
    } catch {}
  }, [isCeo]);

  const setView = (v: RoleView) => {
    setViewState(v);
    try {
      if (v === "real") sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, v);
    } catch {}
  };

  const value = useMemo<RoleViewContextValue>(() => {
    const canSwitch = isCeo;
    // Si no es CEO, jamás puede simular nada.
    const effectiveView: RoleView = canSwitch ? view : "real";

    let effectiveIsCeo = isCeo;
    let effectiveIsAdmin = isAdmin;
    let effectiveRoleLabel = isCeo ? "CEO" : isAdmin ? "Administrador" : "Moderador";

    if (effectiveView === "admin") {
      effectiveIsCeo = false;
      effectiveIsAdmin = true;
      effectiveRoleLabel = "Administrador (vista de prueba)";
    } else if (effectiveView === "moderator") {
      effectiveIsCeo = false;
      effectiveIsAdmin = false;
      effectiveRoleLabel = "Moderador (vista de prueba)";
    }

    return { view: effectiveView, setView, canSwitch, effectiveIsCeo, effectiveIsAdmin, effectiveRoleLabel };
  }, [isCeo, isAdmin, view]);

  return <RoleViewContext.Provider value={value}>{children}</RoleViewContext.Provider>;
}

export function useRoleView() {
  const ctx = useContext(RoleViewContext);
  if (!ctx) {
    // Fallback inocuo si se usa fuera del provider (no debería ocurrir en /admin).
    return {
      view: "real" as RoleView,
      setView: () => {},
      canSwitch: false,
      effectiveIsCeo: false,
      effectiveIsAdmin: false,
      effectiveRoleLabel: "Sin rol",
    } satisfies RoleViewContextValue;
  }
  return ctx;
}
