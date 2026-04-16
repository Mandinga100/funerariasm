import { Info } from "lucide-react";

interface LegalDisclaimerProps {
  /** Optional override; default is a generic informational disclaimer. */
  text?: string;
}

const DEFAULT_TEXT =
  "Este artículo tiene carácter informativo y no constituye asesoría legal, médica ni psicológica. Los procedimientos, plazos y precios pueden variar según la institución, comuna o fecha de consulta. Para casos específicos, le recomendamos verificar con la fuente oficial correspondiente o contactar a nuestro equipo profesional disponible 24/7.";

/**
 * Legal disclaimer rendered as semantic <aside> with role="note".
 * Required for E-E-A-T compliance on funeral/legal/health content.
 */
const LegalDisclaimer = ({ text = DEFAULT_TEXT }: LegalDisclaimerProps) => {
  return (
    <aside
      role="note"
      aria-label="Aviso legal"
      className="not-prose mt-12 mb-2 rounded-lg border border-border/40 bg-muted/40 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <Info className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] uppercase tracking-wide-brand text-muted-foreground/70 font-medium mb-1.5">
            Aviso legal
          </p>
          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
            {text}
          </p>
        </div>
      </div>
    </aside>
  );
};

export default LegalDisclaimer;
