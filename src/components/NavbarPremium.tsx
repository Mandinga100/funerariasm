import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";

const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/servicios" },
  { label: "Planes", href: "/planes" },
  { label: "Obituarios", href: "/obituarios" },
  { label: "Memoriales", href: "/memoriales" },
  { label: "Blog", href: "/blog" },
  { label: "Contacto", href: "/contacto" },
];

const NavbarPremium = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-brand ${
        scrolled
          ? "bg-primary/90 backdrop-blur-md border-b border-gold/20 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/assets/images/brand/logo-white.webp"
            alt="Funeraria Santa Margarita"
            className="h-10 w-auto"
          />
          <div className="hidden sm:block">
            <span className="text-primary-foreground font-playfair text-lg leading-tight block">
              Santa Margarita
            </span>
            <span className="text-gold text-[10px] tracking-solemn uppercase block">
              Funeraria
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm tracking-wide-brand uppercase transition-brand hover:text-gold ${
                location.pathname === link.href
                  ? "text-gold"
                  : "text-primary-foreground/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA + Hamburger */}
        <div className="flex items-center gap-4">
          <a
            href="tel:+56964333760"
            className="hidden md:flex items-center gap-2 bg-gold/10 border border-gold/30 text-gold px-4 py-2 rounded-full text-sm tracking-wide-brand uppercase transition-brand hover:bg-gold hover:text-primary-foreground"
          >
            <Phone className="w-4 h-4" />
            Llamar ahora
          </a>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-primary-foreground p-2"
            aria-label="Menú"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden bg-primary/95 backdrop-blur-md border-t border-gold/10 animate-fade-in">
          <div className="container py-6 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm tracking-wide-brand uppercase py-2 transition-brand ${
                  location.pathname === link.href
                    ? "text-gold"
                    : "text-primary-foreground/80 hover:text-gold"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="tel:+56964333760"
              className="flex items-center justify-center gap-2 bg-gold text-primary-foreground px-6 py-3 rounded-full text-sm tracking-wide-brand uppercase mt-2"
            >
              <Phone className="w-4 h-4" />
              Llamar ahora
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavbarPremium;
