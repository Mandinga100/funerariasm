import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";

const NAV_LINKS = [
  { label: "Inicio", sectionId: "inicio" },
  { label: "Planes", sectionId: "planes" },
  { label: "Servicios", sectionId: "servicios" },
  { label: "Previsión", sectionId: "prevision" },
  { label: "Memoriales", sectionId: "memoriales" },
  { label: "Nosotros", sectionId: "nosotros" },
  { label: "Blog", sectionId: "blog" },
  { label: "Contacto", sectionId: "contacto" },
];

const NavbarPremium = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (location.pathname !== "/") return;

    const ids = NAV_LINKS.map((l) => l.sectionId);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => setMenuOpen(false), [location]);

  const scrollToSection = useCallback(
    (sectionId: string) => {
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }
      setMenuOpen(false);
    },
    [location.pathname, navigate]
  );

  const isHome = location.pathname === "/";

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
        <Link to="/" className="flex items-center group">
          <img
            src="/assets/images/brand/logo-white.webp"
            alt="Funeraria Santa Margarita"
            className="h-10 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.sectionId}
              onClick={() => scrollToSection(link.sectionId)}
              className={`relative text-sm tracking-wide-brand uppercase transition-brand pb-1 ${
                isHome && activeSection === link.sectionId
                  ? "text-gold"
                  : "text-primary-foreground/80 hover:text-gold"
              } after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:bg-gold after:transition-transform after:duration-300 after:origin-left ${
                isHome && activeSection === link.sectionId
                  ? "after:w-full after:scale-x-100"
                  : "after:w-full after:scale-x-0 hover:after:scale-x-100"
              }`}
            >
              {link.label}
            </button>
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
              <button
                key={link.sectionId}
                onClick={() => scrollToSection(link.sectionId)}
                className={`text-left text-sm tracking-wide-brand uppercase py-2 transition-brand ${
                  isHome && activeSection === link.sectionId
                    ? "text-gold"
                    : "text-primary-foreground/80 hover:text-gold"
                }`}
              >
                {link.label}
              </button>
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
