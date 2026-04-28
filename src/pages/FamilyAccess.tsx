import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, ShieldCheck, Mail, RotateCcw, Loader2 } from "lucide-react";
import {
  storeFamilyToken,
  validateFamilyToken,
  resetFamilyAccess,
  getStoredFamilyToken,
} from "@/lib/family-access";

export default function FamilyAccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "recover">("login");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-login si llega ?t=TOKEN en la URL o ya hay sesión guardada
  useEffect(() => {
    document.title = "Acceso Familiar | Legados Eternos · Funeraria Santa Margarita";
    const urlToken = params.get("t");
    const stored = getStoredFamilyToken();
    const candidate = urlToken || stored;
    if (!candidate) return;
    (async () => {
      setLoading(true);
      const session = await validateFamilyToken(candidate);
      setLoading(false);
      if (session) {
        storeFamilyToken(candidate);
        toast({ title: `Bienvenido, ${session.familyName}`, description: "Sesión renovada por 30 días." });
        navigate("/legados-eternos/mi-legado", { replace: true });
      } else if (urlToken) {
        toast({
          title: "Link inválido o expirado",
          description: "Usa tu código de recuperación o contáctanos.",
          variant: "destructive",
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    const session = await validateFamilyToken(token.trim());
    setLoading(false);
    if (!session) {
      toast({ title: "Acceso no válido", description: "Verifica tu link o usa el código de recuperación.", variant: "destructive" });
      return;
    }
    storeFamilyToken(token.trim());
    toast({ title: `Bienvenido, ${session.familyName}` });
    navigate("/legados-eternos/mi-legado", { replace: true });
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !recoveryCode.trim()) return;
    setLoading(true);
    const result = await resetFamilyAccess(email.trim(), recoveryCode.trim().toUpperCase());
    setLoading(false);
    if (!result.success || !result.newToken) {
      toast({
        title: "Recuperación fallida",
        description: "Email o código incorrecto. Contacta al equipo si el problema persiste.",
        variant: "destructive",
      });
      return;
    }
    const session = await validateFamilyToken(result.newToken);
    if (!session) {
      toast({ title: "Error inesperado", variant: "destructive" });
      return;
    }
    storeFamilyToken(result.newToken);
    toast({ title: "Nuevo acceso generado", description: "Ingresando a tu Legado..." });
    navigate("/legados-eternos/mi-legado", { replace: true });
  };

  return (
    <Layout>
      <section className="min-h-screen pt-28 pb-20 bg-primary text-primary-foreground">
        <div className="container max-w-lg">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/15 border border-gold/30 mb-5">
              <KeyRound className="w-7 h-7 text-gold" />
            </div>
            <h1 className="font-playfair italic text-4xl md:text-5xl mb-3">Acceso Familiar</h1>
            <p className="text-primary-foreground/60 text-sm md:text-base">
              Ingresa con el link único entregado por nuestro equipo para gestionar tu Legado Eterno.
            </p>
          </div>

          <Card className="bg-primary-foreground/5 border-primary-foreground/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-primary-foreground text-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gold" />
                {mode === "login" ? "Ingresar a mi Legado" : "Recuperar acceso"}
              </CardTitle>
              <CardDescription className="text-primary-foreground/50">
                {mode === "login"
                  ? "Pega tu link único o token de acceso."
                  : "Usa tu email y código de recuperación de 12 caracteres."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "login" ? (
                <form onSubmit={handleManualLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="token" className="text-primary-foreground/70 text-xs uppercase tracking-wider">
                      Link o token de acceso
                    </Label>
                    <Input
                      id="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Pega aquí tu token único…"
                      required
                      className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gold text-primary hover:bg-gold/90 font-semibold">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                    Ingresar
                  </Button>
                  <button
                    type="button"
                    onClick={() => setMode("recover")}
                    className="w-full text-center text-xs text-primary-foreground/50 hover:text-gold transition-colors mt-2"
                  >
                    ¿Perdiste tu link? Recupera con tu código →
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRecover} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-primary-foreground/70 text-xs uppercase tracking-wider">
                      Email registrado
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recovery" className="text-primary-foreground/70 text-xs uppercase tracking-wider">
                      Código de recuperación (12 caracteres)
                    </Label>
                    <Input
                      id="recovery"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                      placeholder="XXXXXXXXXXXX"
                      required
                      maxLength={12}
                      className="bg-primary-foreground/5 border-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/30 font-mono tracking-widest"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gold text-primary hover:bg-gold/90 font-semibold">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    Recuperar acceso
                  </Button>
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="w-full text-center text-xs text-primary-foreground/50 hover:text-gold transition-colors mt-2"
                  >
                    ← Volver al ingreso normal
                  </button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center text-xs text-primary-foreground/40">
            <p className="flex items-center justify-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              ¿Necesitas ayuda? Contáctanos por <Link to="/contacto" className="text-gold hover:underline ml-1">contacto</Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
