import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { MapPin, ArrowLeft, Heart, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Memorial {
  id: string;
  slug: string;
  full_name: string;
  birth_date: string | null;
  death_date: string;
  photo_url: string | null;
  biography: string | null;
  tribute_text: string | null;
  city: string | null;
  meta_title: string | null;
  meta_description: string | null;
}

interface Condolence {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
}

const MemorialDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [condolences, setCondolences] = useState<Condolence[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("memorials")
        .select("*")
        .eq("slug", slug)
        .eq("published", true);
      const mem = data?.[0] as Memorial | undefined;
      if (mem) {
        setMemorial(mem);
        document.title = `${mem.full_name} — Legado Eterno | Funeraria Santa Margarita`;

        const { data: conds } = await supabase
          .from("condolences")
          .select("id, author_name, message, created_at")
          .eq("memorial_id", mem.id)
          .eq("approved", true)
          .order("created_at", { ascending: false });
        setCondolences((conds as Condolence[]) || []);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (!memorial) return;
    const channel = supabase
      .channel(`condolences-${memorial.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "condolences", filter: `memorial_id=eq.${memorial.id}` }, (payload) => {
        const newC = payload.new as Condolence;
        setCondolences((prev) => [newC, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [memorial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !message.trim() || !memorial) return;
    setSending(true);
    const { error } = await supabase.from("condolences").insert({
      memorial_id: memorial.id,
      author_name: authorName.trim(),
      message: message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("No se pudo enviar su condolencia. Intente nuevamente.");
    } else {
      toast.success("Su condolencia ha sido enviada. Gracias por su mensaje.");
      setAuthorName("");
      setMessage("");
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });

  const getYears = (birth: string | null, death: string) => {
    if (!birth) return null;
    const b = new Date(birth);
    const d = new Date(death);
    let age = d.getFullYear() - b.getFullYear();
    if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) age--;
    return age;
  };

  const formatCondolenceDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });

  if (loading) {
    return (
      <Layout>
        <section className="pt-28 pb-16 bg-primary">
          <div className="container max-w-3xl">
            <div className="animate-pulse space-y-6">
              <div className="w-32 h-32 rounded-full bg-primary-foreground/10 mx-auto" />
              <div className="h-8 bg-primary-foreground/10 rounded w-1/2 mx-auto" />
              <div className="h-4 bg-primary-foreground/10 rounded w-1/3 mx-auto" />
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (!memorial) {
    return (
      <Layout>
        <section className="pt-28 pb-16 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h1 className="text-section font-playfair italic mb-4">Legado no encontrado</h1>
            <Link to="/memoriales" className="text-gold hover:text-gold-light transition-brand">← Volver a Legados Eternos</Link>
          </div>
        </section>
      </Layout>
    );
  }

  const age = getYears(memorial.birth_date, memorial.death_date);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: memorial.full_name,
    birthDate: memorial.birth_date,
    deathDate: memorial.death_date,
    description: memorial.biography,
    address: memorial.city ? { "@type": "PostalAddress", addressLocality: memorial.city } : undefined,
  };

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <section className="pt-28 pb-16 bg-primary text-primary-foreground">
        <div className="container max-w-3xl">
          <Link to="/memoriales" className="group inline-flex items-center gap-2 text-gold/70 hover:text-gold text-sm mb-10 px-5 py-2.5 rounded-full border border-gold/20 hover:border-gold/50 bg-gold/5 hover:bg-gold/10 transition-all duration-300 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.15)] hover:shadow-[0_0_20px_-4px_hsl(var(--gold)/0.35)]">
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Volver a Legados Eternos
          </Link>

          <div className="text-center">
            {/* Photo */}
            <div className="w-36 h-36 rounded-full border-4 border-gold/20 mx-auto mb-6 overflow-hidden bg-primary-foreground/5">
              {memorial.photo_url ? (
                <img src={memorial.photo_url} alt={memorial.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-playfair text-gold/40">
                    {memorial.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </span>
                </div>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-playfair italic text-primary-foreground mb-4">{memorial.full_name}</h1>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-primary-foreground/50">
              {memorial.birth_date && <span>{formatDate(memorial.birth_date)}</span>}
              {memorial.birth_date && <span className="text-gold/60">✦</span>}
              <span>{formatDate(memorial.death_date)}</span>
              {age !== null && <span className="text-gold/50">({age} años)</span>}
              {memorial.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {memorial.city}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-primary">
        <div className="container max-w-3xl space-y-12">
          {/* Tribute */}
          {memorial.tribute_text && (
            <div className="text-center border border-gold/15 rounded-lg p-8 bg-primary-foreground/3">
              <Heart className="w-6 h-6 text-gold/40 mx-auto mb-4" />
              <p className="text-lg text-primary-foreground/70 italic font-playfair leading-relaxed">
                "{memorial.tribute_text}"
              </p>
            </div>
          )}

          {/* Biography */}
          {memorial.biography && (
            <div>
              <h2 className="font-playfair text-xl text-primary-foreground mb-4">Biografía</h2>
              <p className="text-primary-foreground/50 leading-relaxed whitespace-pre-line">{memorial.biography}</p>
            </div>
          )}

          {/* Condolences section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="w-5 h-5 text-gold/40" />
              <h2 className="font-playfair text-xl text-primary-foreground">
                Condolencias ({condolences.length})
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="bg-primary-foreground/3 border border-primary-foreground/10 rounded-lg p-6 mb-8">
              <h3 className="text-sm font-medium text-primary-foreground/70 mb-4">Envíe sus condolencias</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Su nombre"
                  maxLength={100}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 hover:border-gold/20 focus:border-gold/40 text-primary-foreground placeholder:text-primary-foreground/30 text-sm focus:outline-none focus:ring-1 focus:ring-gold/15 transition-all duration-300"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escriba su mensaje de condolencia..."
                  maxLength={500}
                  required
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 hover:border-gold/20 focus:border-gold/40 text-primary-foreground placeholder:text-primary-foreground/30 text-sm focus:outline-none focus:ring-1 focus:ring-gold/15 transition-all duration-300 resize-none"
                />
                <button
                  type="submit"
                  disabled={sending || !authorName.trim() || !message.trim()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gold text-primary font-medium text-sm hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.3)] hover:shadow-[0_0_20px_-4px_hsl(var(--gold)/0.5)]"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Enviando..." : "Enviar condolencia"}
                </button>
              </div>
            </form>

            {condolences.length === 0 ? (
              <p className="text-primary-foreground/30 text-sm text-center py-8">
                Sea el primero en dejar un mensaje de condolencia.
              </p>
            ) : (
              <div className="space-y-4">
                {condolences.map((c) => (
                  <div key={c.id} className="bg-primary-foreground/3 border border-primary-foreground/10 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-primary-foreground/80">{c.author_name}</span>
                      <span className="text-xs text-primary-foreground/30">{formatCondolenceDate(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-primary-foreground/50 leading-relaxed">{c.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Back link */}
          <div className="text-center pt-8">
            <Link to="/memoriales" className="group inline-flex items-center gap-2 text-gold/70 hover:text-gold text-sm px-6 py-3 rounded-full border border-gold/20 hover:border-gold/50 bg-gold/5 hover:bg-gold/10 transition-all duration-300 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.15)] hover:shadow-[0_0_20px_-4px_hsl(var(--gold)/0.35)]">
              <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Volver a Legados Eternos
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default MemorialDetail;
