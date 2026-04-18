import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";

/**
 * Restringe rutas exclusivas del CEO. Si un admin (no CEO) intenta acceder,
 * se le muestra un mensaje claro y se le redirige al Dashboard.
 */
export default function CeoOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isCeo, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isCeo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4 border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl p-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-700 dark:text-amber-300" />
          </div>
          <h2 className="text-lg font-semibold">Sección exclusiva del CEO</h2>
          <p className="text-sm text-muted-foreground">
            Esta sección está reservada para la cuenta CEO de Funeraria Santa Margarita.
            Si necesita modificar contenido crítico (Blog, Obituarios, Legados, Ajustes IA, Suscriptores
            o Auditoría), contacte al CEO.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
