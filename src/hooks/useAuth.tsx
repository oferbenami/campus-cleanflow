import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "campus_manager" | "property_manager" | "supervisor" | "cleaning_staff";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .single();
    setRole((data?.role as AppRole) ?? "cleaning_staff");
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setRole(null);
        }
        // Handle token expiration — force sign out on SIGNED_OUT or TOKEN_REFRESHED failure
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          if (!session) {
            setUser(null);
            setRole(null);
            queryClient.clear();
          }
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    // Clear all cached data to prevent session bleed
    queryClient.clear();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const getRoleRedirect = (role: AppRole | null): string => {
  switch (role) {
    case "campus_manager":
      return "/manager";
    case "property_manager":
      return "/property-manager";
    case "supervisor":
      return "/supervisor";
    case "cleaning_staff":
      return "/staff";
    default:
      return "/staff";
  }
};
