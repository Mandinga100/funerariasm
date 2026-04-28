import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Lock, UserPlus } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: "Error de acceso", description: "Credenciales incorrectas", variant: "destructive" });
    } else {
      navigate("/admin");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 8) {
      toast({ title: "Contraseña muy corta", description: "Debe tener al menos 8 caracteres.", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Verificar que exista una invitación pendiente para este correo
    const cleanEmail = signupEmail.trim().toLowerCase();
    const { data: invitation } = await supabase
      .from("pending_invitations")
      .select("id, role")
      .ilike("email", cleanEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (!invitation) {
      setLoading(false);
      toast({
        title: "Sin invitación",
        description: "No hay una invitación pendiente para este correo. Contacta al administrador para que te invite primero.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        data: { display_name: signupName.trim() || cleanEmail.split("@")[0] },
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "No se pudo crear la cuenta", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Cuenta creada",
      description: "Revisa tu correo para confirmar la cuenta y luego inicia sesión.",
    });
    setSignupEmail("");
    setSignupPassword("");
    setSignupName("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acceso Interno</CardTitle>
          <CardDescription>Panel de administración — Funeraria Santa Margarita</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo electrónico</Label>
                  <Input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@funeraria.cl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Ingresando..." : "Ingresar"}
                </Button>
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Acceso restringido. Solo personal autorizado por el administrador.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <UserPlus className="w-4 h-4 mt-0.5 shrink-0 text-[#C5A059]" />
                  <p>Solo personas <strong>previamente invitadas</strong> por el administrador pueden crear su cuenta aquí. Al registrarte recibirás automáticamente el rol asignado.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo invitado</Label>
                  <Input id="signup-email" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required placeholder="tu-correo@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nombre (opcional)</Label>
                  <Input id="signup-name" value={signupName} onChange={e => setSignupName(e.target.value)} placeholder="Tu nombre completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Crear contraseña</Label>
                  <Input id="signup-password" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required placeholder="Mínimo 8 caracteres" />
                  {signupPassword && signupPassword.length < 8 && (
                    <p className="text-[10px] text-destructive">La contraseña debe tener al menos 8 caracteres</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading || signupPassword.length < 8}>
                  {loading ? "Creando cuenta..." : "Crear mi cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
