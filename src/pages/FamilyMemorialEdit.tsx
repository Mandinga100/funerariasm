import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  validateFamilyToken,
  getStoredFamilyToken,
  clearFamilyToken,
  type FamilySession,
} from "@/lib/family-access";
import { Heart, LogOut, Save, ExternalLink, Loader2, ShieldCheck } from "lucide-react";

interface MemorialData {
  id: string;
  full_name: string;
  slug: string;
  biography: string | null;
  tribute_text: string | null;
  photo_url: string | null;
}

export default function FamilyMemorialEdit() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [session, setSession] = useState<FamilySession | null>(null);
  const [memorial, setMemorial] = useState<MemorialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [biography, setBiography] = useState("");
  const [tribute, setTribute] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    document.title = "Mi Legado Eterno | Funeraria Santa Margarita";
    const token = getStoredFamilyToken();
    if (!token) {
      navigate("/legados-eternos/acceso", { replace: true });
      return;
    }
    (async () => {
      const sess = await validateFamilyToken(token);
      if (!sess) {
        clearFamilyToken();
        navigate("/legados-eternos/acceso", { replace: true });
        return;
      }
      setSession(sess);
      const { data } = await supabase
        .from("memorials")
        .select("id, full_name, slug, biography, tribute_text, photo_url")
        .eq("id", sess.memorialId)
        .maybeSingle();
      if (data) {
        setMemorial(data);
        setBiography(data.biography ?? "");
        setTribute(data.tribute_text ?? "");
        setPhotoUrl(data.photo_url ?? "");
      }
      setLoading(false);
    })();
  }, [navigate]);

  const handleSave = async () => {
    const token = getStoredFamilyToken();
    if (!token || !session) return;
    setSaving(true);
    const { data, error } = await supabase.rpc("family_update_memorial", {
      _token: token,
      _biography: biography,
      _tribute_text: tribute,
      _photo_url: photoUrl || null,
    });
    setSaving(false);
    if (error || data !== true) {
      toast({ title: "No se pudo guardar", description: error?.message ?? "Sesión expirada", variant: "destructive" });
      return;
    }
    toast({ title: "Cambios guardados", description: "Tu Legado Eterno ha sido actualizado." });
  };

  const handleLogout = () => {
    clearFamilyToken();
    toast({ title: "Sesión cerrada" });
    navigate("/legados-eternos/acceso", { replace: true });
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-primary">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!session || !memorial) return null;

  const expiresIn = Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <Layout>
      <section className="min-h-screen pt-28 pb-20 bg-primary text-primary-foreground">
        <div className="container max-w-3xl">
          {/* Header sesión */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs text-gold/80 uppercase tracking-[0.2em] mb-2">
                <Heart className="w-3.5 h-3.5" />
                Mi Legado Eterno
              </div>
              <h1 className="font-playfair italic text-3xl md:text-4xl">{memorial.full_name}</h1>
              <p className="text-primary-foreground/50 text-sm mt-1">
                Sesión de <span className="text-primary-foreground/80">{session.familyName}</span> · vence en {expiresIn} días
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/5">
                <Link to={`/legados-eternos/${memorial.slug}`} target="_blank">
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Ver público
                </Link>
              </Button>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/5">
                <LogOut className="w-4 h-4 mr-1.5" />
                Salir
              </Button>
            </div>
          </div>

          <div className="bg-gold/5 border border-gold/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-xs text-gold/90">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Sesión cifrada y renovable. Tus cambios son visibles inmediatamente en el sitio público.</span>
          </div>

          <Card className="bg-primary-foreground/5 border-primary-foreground/10">
            <CardHeader>
              <CardTitle className="text-primary-foreground text-lg">Editar Legado</CardTitle>
              <CardDescription className="text-primary-foreground/50">
                Actualiza la biografía, el tributo y la foto principal de tu ser querido.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-primary-foreground/70 text-xs uppercase tracking-wider">URL de foto principal</Label>
                <Input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30"
                />
                {photoUrl && (
                  <img src={photoUrl} alt="Preview" className="mt-2 w-32 h-40 object-cover rounded-lg border border-primary-foreground/10" />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-primary-foreground/70 text-xs uppercase tracking-wider">Texto tributo</Label>
                <Textarea
                  rows={4}
                  value={tribute}
                  onChange={(e) => setTribute(e.target.value)}
                  placeholder="Una frase que honre su memoria…"
                  className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-primary-foreground/70 text-xs uppercase tracking-wider">Biografía</Label>
                <Textarea
                  rows={10}
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  placeholder="Cuenta su historia, sus pasiones, lo que dejó en el mundo…"
                  className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving} className="bg-gold text-primary hover:bg-gold/90 font-semibold">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar cambios
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
