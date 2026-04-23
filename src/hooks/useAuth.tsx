import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { clearAvatarCache } from "@/lib/avatar-url";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isCeo: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCeo, setIsCeo] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (data ?? []).map(r => r.role);
    const hasAdmin = roles.includes("admin");
    const hasCeoRole = roles.includes("ceo");
    // CEO se determina exclusivamente por el rol 'ceo' en la base de datos.
    // No usamos email hardcodeado para evitar exponer datos personales en el bundle público.
    setIsAdmin(hasAdmin || hasCeoRole);
    setIsCeo(hasCeoRole);
  };

  useEffect(() => {
    let isMounted = true;

    const syncSession = async (session: Session | null) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await checkRoles(session.user.id);
      } else {
        setIsAdmin(false);
        setIsCeo(false);
      }

      if (!isMounted) return;
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;

        setLoading(true);

        void syncSession(session);
      }
    );

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await syncSession(session);
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAvatarCache();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsCeo(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isCeo, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
