import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

const WHATSAPP = "https://wa.me/56964333760";

const FooterPremium = forwardRef<HTMLElement>((_props, ref) => (
  <footer className="bg-primary text-primary-foreground">
    {/* Main */}
    <div className="container py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand */}
        <div className="space-y-4">
          <img src="/assets/images/brand/logo-white.webp" alt="Funeraria Santa Margarita" className="h-10 w-auto" />
          <p className="text-primary-foreground/60 text-sm leading-relaxed">
            Acompañamos a las familias con respeto, calidez y profesionalismo en los momentos más difíciles.
          </p>
        </div>

        {/* Nav */}
        <div>
          <h4 className="text-gold text-xs tracking-solemn uppercase mb-6">Navegación</h4>
          <ul className="space-y-3">
            {[
              ["Inicio", "/"],
              ["Servicios", "/servicios"],
              ["Planes Funerarios", "/planes"],
              ["Obituarios", "/obituarios"],
              ["Legados Eternos", "/legados-eternos"],
              ["Blog", "/blog"],
              ["Preguntas Frecuentes", "/preguntas-frecuentes"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link to={href} className="text-sm text-primary-foreground/60 hover:text-gold transition-brand">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-gold text-xs tracking-solemn uppercase mb-6">Contacto</h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 text-sm text-primary-foreground/60">
              <Phone className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <div>
                <a href="tel:+56964333760" className="hover:text-gold transition-brand block">+56 9 6433 3760</a>
              </div>
            </li>
            <li className="flex items-start gap-3 text-sm text-primary-foreground/60">
              <Mail className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <a href="mailto:funerariasantamargarita2026@gmail.com" className="hover:text-gold transition-brand break-all">
                funerariasantamargarita2026@gmail.com
              </a>
            </li>
            <li className="flex items-start gap-3 text-sm text-primary-foreground/60">
              <MapPin className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <span>Santiago, Chile</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-primary-foreground/60">
              <Clock className="w-4 h-4 text-gold mt-0.5 shrink-0" />
              <span>Atención 24/7, los 365 días</span>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-gold text-xs tracking-solemn uppercase mb-6">Legal</h4>
          <ul className="space-y-3">
            {[
              ["Política de Privacidad", "/privacidad"],
              ["Términos de Servicio", "/terminos"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link to={href} className="text-sm text-primary-foreground/60 hover:text-gold transition-brand">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 bg-gold/10 border border-gold/30 text-gold px-5 py-2.5 rounded-full text-sm tracking-wide-brand uppercase transition-brand hover:bg-gold hover:text-primary-foreground"
          >
            WhatsApp 24/7
          </a>
        </div>
      </div>
    </div>

    {/* Bottom */}
    <div className="border-t border-primary-foreground/10">
      <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-primary-foreground/40">
          © {new Date().getFullYear()} Funeraria Santa Margarita. Todos los derechos reservados.
        </p>
        <p className="text-xs text-primary-foreground/30">
          Santiago, Chile — Servicio profesional y humano
        </p>
      </div>
    </div>
  </footer>
));

FooterPremium.displayName = "FooterPremium";
export default FooterPremium;
