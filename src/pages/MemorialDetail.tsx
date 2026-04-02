import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { MapPin, ArrowLeft, Heart, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import MemorialPhoto from "@/components/memorial/MemorialPhoto";
import OfferingButtons from "@/components/memorial/OfferingButtons";
import CrownDonationModal from "@/components/memorial/CrownDonationModal";
import TributesModal from "@/components/memorial/TributesModal";

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
}

interface Condolence {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
}

interface Offering {
  id: string;
  offering_type: string;
  crown_tier?: number;
  donor_name?: string;
  donor_message?: string;
  amount?: number;
  created_at?: string;
}

// Pure in-memory tracking — resets on reload or navigation
let memoryActions: Record<string, Set<string>> = {};

function hasPageAction(memorialId: string, type: string): boolean {
  return memoryActions[memorialId]?.has(type) ?? false;
}

function markPageAction(memorialId: string, type: string) {
  if (!memoryActions[memorialId]) memoryActions[memorialId] = new Set();
  memoryActions[memorialId].add(type);
}

const MemorialDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [condolences, setCondolences] = useState<Condolence[]>([]);
  const [sessionOfferings, setSessionOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [crownModalOpen, setCrownModalOpen] = useState(false);
  const [tributesModalOpen, setTributesModalOpen] = useState(false);
  const [crownSending, setCrownSending] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

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
        // Load condolences
        const condsRes = await supabase
          .from("condolences")
          .select("id, author_name, message, created_at")
          .eq("memorial_id", mem.id)
          .eq("approved", true)
          .order("created_at", { ascending: false });
        setCondolences((condsRes.data as Condolence[]) || []);
        // Offerings start empty — ephemeral, reset on reload
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  // Realtime for condolences only
  useEffect(() => {
    if (!memorial) return;
    const channel = supabase
      .channel(`memorial-${memorial.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "condolences", filter: `memorial_id=eq.${memorial.id}` }, (payload) => {
        setCondolences((prev) => [payload.new as Condolence, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [memorial]);

  const handleCondolenceSubmit = async (e: React.FormEvent) => {
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
      toast.error("No se pudo enviar su condolencia.");
    } else {
      toast.success("Condolencia enviada. Gracias.");
      setAuthorName("");
      setMessage("");
    }
  };

  const addOffering = useCallback((type: "candle" | "flower") => {
    if (!memorial) return;
    if (hasPageAction(memorial.id, type)) {
      toast.info(type === "candle" ? "Ya encendió una vela en esta sesión" : "Ya ofreció flores en esta sesión");
      return;
    }
    const offering: Offering = {
      id: crypto.randomUUID(),
      offering_type: type,
      donor_name: "Anónimo",
      created_at: new Date().toISOString(),
    };
    markPageAction(memorial.id, type);
    setSessionOfferings((prev) => [...prev, offering]);
    toast.success(type === "candle" ? "🕯 Vela encendida con amor" : "🌸 Flor ofrecida con cariño");
  }, [memorial]);

  const handleCrownDonate = useCallback((data: { donorName: string; message: string; amount: number; tier: number; simulate: boolean }) => {
    if (!memorial) return;
    setCrownSending(true);

    if (!data.simulate) {
      toast.info("Integración de pagos próximamente. Se registrará como simulación.");
    }

    const offering: Offering = {
      id: crypto.randomUUID(),
      offering_type: "flower_crown",
      donor_name: data.donorName,
      donor_message: data.message,
      amount: data.amount,
      crown_tier: data.tier,
      created_at: new Date().toISOString(),
    };
    markPageAction(memorial.id, "flower_crown");
    setSessionOfferings((prev) => [...prev, offering]);
    setCrownSending(false);
    toast.success("🌺 Corona de flores ofrecida en su memoria");
    setCrownModalOpen(false);
  }, [memorial]);

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

  const candleCount = sessionOfferings.filter((o) => o.offering_type === "candle").length;
  const flowerCount = sessionOfferings.filter((o) => o.offering_type === "flower").length;
  const crownCount = sessionOfferings.filter((o) => o.offering_type === "flower_crown").length;

  const candleUsed = memorial ? hasPageAction(memorial.id, "candle") : false;
  const flowerUsed = memorial ? hasPageAction(memorial.id, "flower") : false;

  if (loading) {
    return (
      <Layout>
        <section className="pt-28 pb-16 bg-primary">
          <div className="container max-w-3xl">
            <div className="animate-pulse space-y-6">
              <div className="w-48 h-48 rounded-full bg-primary-foreground/10 mx-auto" />
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

      <section className="pt-28 pb-12 bg-primary text-primary-foreground">
        <div className="container max-w-3xl">
          <Link to="/memoriales" className="group inline-flex items-center gap-2 text-gold/70 hover:text-gold text-sm mb-10 px-5 py-2.5 rounded-full border border-gold/20 hover:border-gold/50 bg-gold/5 hover:bg-gold/10 transition-all duration-300 shadow-[0_0_12px_-4px_hsl(var(--gold)/0.15)] hover:shadow-[0_0_20px_-4px_hsl(var(--gold)/0.35)]">
            <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            Volver a Legados Eternos
          </Link>

          <div className="text-center">
            <MemorialPhoto
              photoUrl={memorial.photo_url}
              fullName={memorial.full_name}
              offerings={sessionOfferings}
            />

            <h1 className="text-3xl md:text-4xl font-playfair italic text-primary-foreground mb-4 mt-10">{memorial.full_name}</h1>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-primary-foreground/50">
              {memorial.birth_date && <span>{formatDate(memorial.birth_date)}</span>}
              {memorial.birth_date && <span className="text-gold/60">✦</span>}
              <span>{formatDate(memorial.death_date)}</span>
              {age !== null && <span className="text-gold/50">({age} años)</span>}
              {memorial.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {memorial.city}</span>
              )}
            </div>

            <OfferingButtons
              onCandle={() => addOffering("candle")}
              onFlower={() => addOffering("flower")}
              onCrown={() => setCrownModalOpen(true)}
              onViewTributes={() => setTributesModalOpen(true)}
              candleCount={candleCount}
              flowerCount={flowerCount}
              crownCount={crownCount}
              candleDisabled={candleUsed}
              flowerDisabled={flowerUsed}
            />
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary">
        <div className="container max-w-3xl space-y-12">
          {memorial.tribute_text && (
            <div className="text-center border border-gold/15 rounded-lg p-8 bg-primary-foreground/[0.02]">
              <Heart className="w-6 h-6 text-gold/40 mx-auto mb-4" />
              <p className="text-lg text-primary-foreground/70 italic font-playfair leading-relaxed">
                "{memorial.tribute_text}"
              </p>
            </div>
          )}

          {memorial.biography && (
            <div>
              <h2 className="font-playfair text-xl text-primary-foreground mb-4">Biografía</h2>
              <p className="text-primary-foreground/50 leading-relaxed whitespace-pre-line">{memorial.biography}</p>
            </div>
          )}

          <div>
            <div className="flex items-center gap-3 mb-6">
              <MessageCircle className="w-5 h-5 text-gold/40" />
              <h2 className="font-playfair text-xl text-primary-foreground">
                Condolencias ({condolences.length})
              </h2>
            </div>

            <form onSubmit={handleCondolenceSubmit} className="bg-primary-foreground/[0.02] border border-primary-foreground/10 rounded-lg p-6 mb-8">
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
                  <div key={c.id} className="bg-primary-foreground/[0.02] border border-primary-foreground/10 rounded-lg p-5">
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

          <div className="text-center pt-8">
            <Link to="/memoriales" className="group inline-flex items-center gap-2 text-gold/70 hover:text-gold text-sm px-6 py-3 rounded-full border border-gold/20 hover:border-gold/50 bg-gold/5 hover:bg-gold/10 transition-all duration-300">
              <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Volver a Legados Eternos
            </Link>
          </div>
        </div>
      </section>

      <CrownDonationModal
        open={crownModalOpen}
        onClose={() => setCrownModalOpen(false)}
        onDonate={handleCrownDonate}
        memorialName={memorial.full_name}
        sending={crownSending}
      />

      <TributesModal
        open={tributesModalOpen}
        onClose={() => setTributesModalOpen(false)}
        offerings={sessionOfferings}
        memorialName={memorial.full_name}
      />
    </Layout>
  );
};

export default MemorialDetail;
