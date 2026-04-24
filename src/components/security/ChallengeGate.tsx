import { useMemo, useState } from "react";
import { Shield, Check, RefreshCw } from "lucide-react";
import { markChallengePassed } from "@/lib/bot-shield";

interface ChallengeGateProps {
  /** Misma clave de formulario usada en checkBotShield. */
  formKey: string;
  /** Se llama cuando el usuario resuelve correctamente el captcha. */
  onPass: () => void;
}

/**
 * Captcha aritmético ligero.
 * Solo se monta cuando el Bot Shield detecta sospechas repetidas para `formKey`.
 * No envía nada al servidor: marca `markChallengePassed(formKey)` en localStorage
 * y permite reintentar el envío durante CHALLENGE_PASS_TTL_MS (10 min).
 */
const ChallengeGate = ({ formKey, onPass }: ChallengeGateProps) => {
  const [seed, setSeed] = useState(0);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const challenge = useMemo(() => {
    // Operandos pequeños y operación segura para no parecer hostil.
    const a = 2 + Math.floor(Math.random() * 8); // 2-9
    const b = 1 + Math.floor(Math.random() * 8); // 1-8
    return { a, b, expected: a + b };
    // seed fuerza recálculo al pedir uno nuevo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(value.trim());
    if (!Number.isFinite(parsed) || parsed !== challenge.expected) {
      setError("Resultado incorrecto. Intente nuevamente.");
      setValue("");
      setSeed((s) => s + 1);
      return;
    }
    markChallengePassed(formKey);
    onPass();
  };

  return (
    <div
      role="group"
      aria-label="Verificación anti-bot"
      className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3"
    >
      <div className="flex items-start gap-2">
        <Shield className="w-4 h-4 text-gold mt-0.5 shrink-0" />
        <p className="text-xs text-foreground leading-relaxed">
          Para proteger este formulario, confirme que es una persona resolviendo esta operación.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground" htmlFor={`challenge-${formKey}`}>
          ¿Cuánto es <span className="font-playfair italic">{challenge.a} + {challenge.b}</span>?
        </label>
        <input
          id={`challenge-${formKey}`}
          type="number"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          className="w-20 bg-background border border-border rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:border-gold/60"
          aria-invalid={!!error}
          aria-describedby={error ? `challenge-error-${formKey}` : undefined}
          required
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 bg-gold hover:bg-gold-dark text-accent-foreground px-3 py-1.5 rounded-md text-xs font-medium transition-brand"
        >
          <Check className="w-3.5 h-3.5" /> Verificar
        </button>
        <button
          type="button"
          onClick={() => {
            setSeed((s) => s + 1);
            setValue("");
            setError(null);
          }}
          aria-label="Generar otra operación"
          className="inline-flex items-center text-muted-foreground hover:text-foreground p-1.5 rounded-md transition-brand"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </form>

      {error && (
        <p id={`challenge-error-${formKey}`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export default ChallengeGate;
