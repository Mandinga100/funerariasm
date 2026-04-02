import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Calendar, MapPin, ArrowLeft, Heart, Send, MessageCircle } from "lucide-react";
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
        document.title = `${mem.full_name} — Memorial | Funeraria Santa Margarita`;

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

  // Realtime condolences
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
              <div className="w-32 h-32 rounded-full bg-muted mx-auto" />
              <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
              <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
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
            <h1 className="text-section font-playfair italic mb-4">Memorial no encontrado</h1>
            <Link to="/memoriales" className="text-gold hover:text-gold-light transition-brand">← Volver a Memoriales</Link>
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
          <Link to="/memoriales" className="group inline-flex items-center gap-2 text-gold/80 hover:text-gold text-sm mb-8 px-5 py-2.5 rounded-full border border-gold/30 hover:border-gold/60 bg-gold/5 hover:bg-gold/10 transition-all duration-300 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.2)] hover:shadow-[0_0_16px_-4px_hsl(var(--gold)/0.4)]">
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Volver a Memoriales
          </Link>

          <div className="text-center">
            <div className="w-32 h-32 rounded-full bg-muted border-4 border-gold/30 mx-auto mb-6 flex items-center justify-center overflow-hidden">
              {memorial.photo_url ? (
                <img src={memorial.photo_url} alt={memorial.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-playfair text-gold/60">
                  {memorial.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-playfair italic text-primary-foreground mb-3">{memorial.full_name}</h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-primary-foreground/60">
              {memorial.birth_date && <span>{formatDate(memorial.birth_date)}</span>}
              {memorial.birth_date && <span className="text-gold">✦</span>}
              <span>{formatDate(memorial.death_date)}</span>
              {age !== null && <span className="text-gold/70">({age} años)</span>}
              {memorial.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {memorial.city}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-background">
        <div className="container max-w-3xl space-y-12">
          {/* Tribute */}
          {memorial.tribute_text && (
            <div className="text-center border border-gold/20 rounded-lg p-8 bg-card">
              <Heart className="w-6 h-6 text-gold/60 mx-auto mb-4" />
              <p className="text-lg text-foreground italic font-playfair leading-relaxed">
                "{memorial.tribute_text}"
              </p>
            </div>
          )}

          {/* Biography */}
          {memorial.biography && (
            <div>
              <h2 className="font-playfair text-xl text-foreground mb-4">Biografía</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{memorial.biography}</p>
            </div>
          )}

          {/* Condolences section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="w-5 h-5 text-gold/60" />
              <h2 className="font-playfair text-xl text-foreground">
                Condolencias ({condolences.length})
              </h2>
            </div>

            {/* Submit form */}
            <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-lg p-6 mb-8">
              <h3 className="text-sm font-medium text-foreground mb-4">Envíe sus condolencias</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Su nombre"
                  maxLength={100}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border hover:border-gold/30 focus:border-gold/50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold/20 transition-brand"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escriba su mensaje de condolencia..."
                  maxLength={500}
                  required
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border hover:border-gold/30 focus:border-gold/50 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold/20 transition-brand resize-none"
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

            {/* Condolences list */}
            {condolences.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                Sea el primero en dejar un mensaje de condolencia.
              </p>
            ) : (
              <div className="space-y-4">
                {condolences.map((c) => (
                  <div key={c.id} className="bg-card border border-border/50 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-foreground">{c.author_name}</span>
                      <span className="text-xs text-muted-foreground">{formatCondolenceDate(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Back link */}
          <div className="text-center pt-8">
            <Link to="/memoriales" className="group inline-flex items-center gap-2 text-gold/80 hover:text-gold text-sm px-6 py-3 rounded-full border border-gold/30 hover:border-gold/60 bg-gold/5 hover:bg-gold/10 transition-all duration-300 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.2)] hover:shadow-[0_0_16px_-4px_hsl(var(--gold)/0.4)]">
              <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Volver a Memoriales
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default MemorialDetail;
