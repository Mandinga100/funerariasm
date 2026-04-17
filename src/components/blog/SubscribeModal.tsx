import { useState } from "react";
import { Mail, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

interface SubscribeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: string;
}

const emailSchema = z.string().trim().email({ message: "Ingrese un correo válido" }).max(255);

const SubscribeModal = ({ open, onOpenChange, source = "blog_floating_cta" }: SubscribeModalProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Correo inválido");
      return;
    }
    setLoading(true);
    try {
      const { error: insertError } = await supabase
        .from("blog_subscribers")
        .insert({ email: parsed.data.toLowerCase(), source });
      if (insertError) {
        // Unique violation = ya suscrito → tratar como éxito amable
        if (insertError.code === "23505") {
          setSuccess(true);
        } else {
          setError("No fue posible procesar la suscripción. Intente nuevamente.");
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Ocurrió un error inesperado. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Reset cuando se cierra
      setTimeout(() => {
        setEmail("");
        setSuccess(false);
        setError(null);
      }, 200);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-gold/20 bg-card">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
            {success ? (
              <CheckCircle2 className="w-6 h-6 text-gold" />
            ) : (
              <Mail className="w-6 h-6 text-gold" />
            )}
          </div>
          <DialogTitle className="font-playfair italic text-2xl text-foreground text-center">
            {success ? "¡Suscripción confirmada!" : "Apoyo y atención personalizada"}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground leading-relaxed">
            {success
              ? "Le enviaremos novedades, guías y orientación funeraria directamente a su correo."
              : "Suscríbase para recibir guías personalizadas, orientación profesional y novedades 24/7 en su correo."}
          </DialogDescription>
        </DialogHeader>

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="su.correo@ejemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                aria-invalid={!!error}
                aria-describedby={error ? "subscribe-error" : undefined}
                className="bg-background border-border/60 focus-visible:border-gold focus-visible:ring-gold/20"
                required
                maxLength={255}
              />
              {error && (
                <p id="subscribe-error" className="text-xs text-destructive mt-2 ml-1">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-accent-foreground px-5 py-2.5 rounded-full text-sm font-medium transition-brand shadow-[0_4px_14px_-4px_rgba(197,160,89,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(197,160,89,0.7)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Suscribirse Ahora
                </>
              )}
            </button>

            <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
              Su correo se usa solo para enviarle contenido funerario relevante. Sin spam.
            </p>
          </form>
        )}

        {success && (
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="w-full inline-flex items-center justify-center gap-2 bg-gold hover:bg-gold-dark text-accent-foreground px-5 py-2.5 rounded-full text-sm font-medium transition-brand shadow-[0_4px_14px_-4px_rgba(197,160,89,0.5)] hover:shadow-[0_6px_20px_-4px_rgba(197,160,89,0.7)] hover:-translate-y-0.5 transition-all duration-300 mt-2"
          >
            Continuar leyendo
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubscribeModal;
