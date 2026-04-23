import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRef, useState } from "react";
import { render, screen, act } from "@testing-library/react";

// Mock sonner para capturar invocaciones del toast
const successMock = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => successMock(...args),
  },
}));

import { toast as sonnerToast } from "sonner";

/**
 * Componente de prueba que reproduce el guard de deduplicación
 * implementado en AdminCasos.tsx para el toast "Ver en agenda".
 *
 * - Mantiene un Set<string> en useRef para registrar IDs ya notificados.
 * - Expone un botón que simula la invocación de `onSaved(createdId)`.
 * - Expone un botón que fuerza re-render (cambio de estado).
 */
function HostWithGuard({ savedId }: { savedId: string }) {
  const notifiedRef = useRef<Set<string>>(new Set());
  const [, setTick] = useState(0);

  const handleSaved = (createdId?: string) => {
    if (!createdId) return;
    if (notifiedRef.current.has(createdId)) return;
    notifiedRef.current.add(createdId);
    sonnerToast.success("Evento creado en la agenda", {
      id: `agenda-created-${createdId}`,
      description: "Puedes abrirlo directamente para revisar o editar.",
      action: { label: "Ver en agenda", onClick: () => {} },
      duration: 8000,
    });
  };

  return (
    <div>
      <button onClick={() => handleSaved(savedId)}>save</button>
      <button onClick={() => setTick((n) => n + 1)}>rerender</button>
    </div>
  );
}

describe("Agenda derivation toast dedupe", () => {
  beforeEach(() => {
    successMock.mockClear();
  });

  it("muestra el toast 'Ver en agenda' una sola vez por evento aunque onSaved se invoque varias veces", () => {
    render(<HostWithGuard savedId="evt-001" />);
    const saveBtn = screen.getByText("save");

    act(() => { saveBtn.click(); });
    act(() => { saveBtn.click(); });
    act(() => { saveBtn.click(); });

    expect(successMock).toHaveBeenCalledTimes(1);
    const [title, opts] = successMock.mock.calls[0] as [string, { id: string; action: { label: string } }];
    expect(title).toBe("Evento creado en la agenda");
    expect(opts.id).toBe("agenda-created-evt-001");
    expect(opts.action.label).toBe("Ver en agenda");
  });

  it("no vuelve a disparar el toast tras un re-render del componente padre", () => {
    render(<HostWithGuard savedId="evt-002" />);
    const saveBtn = screen.getByText("save");
    const rerenderBtn = screen.getByText("rerender");

    act(() => { saveBtn.click(); });
    expect(successMock).toHaveBeenCalledTimes(1);

    // Forzar varios re-renders y re-invocar onSaved con el mismo id
    act(() => { rerenderBtn.click(); });
    act(() => { rerenderBtn.click(); });
    act(() => { saveBtn.click(); });
    act(() => { saveBtn.click(); });

    expect(successMock).toHaveBeenCalledTimes(1);
  });

  it("dispara un toast independiente por cada nuevo ID de evento", () => {
    const { rerender } = render(<HostWithGuard savedId="evt-A" />);
    act(() => { screen.getByText("save").click(); });
    expect(successMock).toHaveBeenCalledTimes(1);

    // Mismo host, mismo Set: si llega un ID nuevo, sí debe notificar
    rerender(<HostWithGuard savedId="evt-B" />);
    act(() => { screen.getByText("save").click(); });
    expect(successMock).toHaveBeenCalledTimes(2);

    // Repetir evt-B no debe notificar otra vez
    act(() => { screen.getByText("save").click(); });
    expect(successMock).toHaveBeenCalledTimes(2);

    const ids = successMock.mock.calls.map((c) => (c[1] as { id: string }).id);
    expect(ids).toEqual(["agenda-created-evt-A", "agenda-created-evt-B"]);
  });

  it("ignora invocaciones de onSaved sin createdId (no muestra toast)", () => {
    function HostNoId() {
      const notifiedRef = useRef<Set<string>>(new Set());
      const handleSaved = (createdId?: string) => {
        if (!createdId) return;
        if (notifiedRef.current.has(createdId)) return;
        notifiedRef.current.add(createdId);
        sonnerToast.success("Evento creado en la agenda", { id: `agenda-created-${createdId}` });
      };
      return <button onClick={() => handleSaved(undefined)}>save-noid</button>;
    }
    render(<HostNoId />);
    act(() => { screen.getByText("save-noid").click(); });
    act(() => { screen.getByText("save-noid").click(); });
    expect(successMock).not.toHaveBeenCalled();
  });
});
