import { Link } from "react-router-dom";
import { Phone, MessageCircle, FileText, Heart, ArrowRight } from "lucide-react";
import { buildWhatsAppUrlDirect } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

type CTAVariant = "contact" | "plans" | "legados" | "prevision" | "whatsapp";

interface BlogCTAProps {
  variant?: CTAVariant;
  className?: string;
}

const CTA_CONFIG: Record<CTAVariant, {
  icon: React.ElementType;
  title: string;
  description: string;
  buttonText: string;
  href: string;
  external?: boolean;
  secondaryText?: string;
  secondaryHref?: string;
}> = {
  contact: {
    icon: Phone,
    title: "¿Necesita orientación profesional?",
    description: "Nuestro equipo está disponible las 24 horas, los 7 días de la semana, para acompañarle con empatía y profesionalismo.",
    buttonText: "Contactar ahora",
    href: "/contacto",
    secondaryText: "Llamar al +56 9 6433 3760",
    secondaryHref: "tel:+56964333760",
  },
  plans: {
    icon: FileText,
    title: "Compare nuestros planes funerarios",
    description: "Planes desde $1.290.000 con cobertura completa, gestión de trámites incluida y atención 24/7.",
    buttonText: "Ver planes y precios",
    href: "/planes",
    secondaryText: "Solicitar cotización personalizada",
    secondaryHref: "/contacto",
  },
  legados: {
    icon: Heart,
    title: "Preserve la memoria con un Legado Eterno",
    description: "Cree un espacio digital permanente donde familiares y amigos puedan dejar condolencias, homenajes y recuerdos.",
    buttonText: "Conocer Legados Eternos",
    href: "/legados-eternos",
    secondaryText: "Ver ejemplos de Legados Eternos",
    secondaryHref: "/legados-eternos",
  },
  prevision: {
    icon: FileText,
    title: "Planifique con anticipación y congele precios",
    description: "La previsión funeraria le permite organizar todo hoy, al precio actual, liberando a su familia de gestiones futuras.",
    buttonText: "Conocer opciones de previsión",
    href: "/planes",
    secondaryText: "Hablar con un asesor",
    secondaryHref: "/contacto",
  },
  whatsapp: {
    icon: MessageCircle,
    title: "Resuelva sus dudas al instante",
    description: "Escríbanos por WhatsApp y reciba respuesta inmediata de nuestro equipo profesional.",
    buttonText: "Escribir por WhatsApp",
    href: buildWhatsAppUrlDirect("Hola, necesito información sobre servicios funerarios."),
    external: true,
    secondaryText: "Ver preguntas frecuentes",
    secondaryHref: "/preguntas-frecuentes",
  },
};

const BlogCTA = ({ variant = "contact", className }: BlogCTAProps) => {
  const config = CTA_CONFIG[variant];
  const Icon = config.icon;

  const ButtonWrapper = config.external ? "a" : Link;
  const buttonProps = config.external
    ? { href: config.href, target: "_blank", rel: "noopener noreferrer" }
    : { to: config.href };

  return (
    <div
      className={cn(
        "relative my-10 p-6 sm:p-8 rounded-xl border border-gold/20 bg-gradient-to-br from-card via-card to-gold/[0.03] overflow-hidden",
        className
      )}
    >
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-gold" />
        </div>
        <div className="flex-1 space-y-3">
          <h3 className="font-playfair text-lg text-foreground">{config.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* @ts-ignore - dynamic component */}
            <ButtonWrapper
              {...buttonProps as any}
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-accent-foreground px-5 py-2.5 rounded-full text-sm tracking-wide-brand uppercase transition-brand font-medium"
            >
              {config.buttonText}
              <ArrowRight className="w-3.5 h-3.5" />
            </ButtonWrapper>
            {config.secondaryText && config.secondaryHref && (
              config.secondaryHref.startsWith("tel:") || config.secondaryHref.startsWith("http") ? (
                <a
                  href={config.secondaryHref}
                  className="text-sm text-gold/80 hover:text-gold transition-colors underline underline-offset-2"
                >
                  {config.secondaryText}
                </a>
              ) : (
                <Link
                  to={config.secondaryHref}
                  className="text-sm text-gold/80 hover:text-gold transition-colors underline underline-offset-2"
                >
                  {config.secondaryText}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogCTA;
