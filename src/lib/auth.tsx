import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profile = {
  id: string;
  role: "applicant" | "student" | "teacher" | "superadmin";
  full_name: string;
  status: string;
  email: string;
  whatsapp: string | null;
  email_verified: boolean;
  whatsapp_verified: boolean;
};
type Ctx = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  session: null, profile: null, loading: true, signOut: async () => {}, refresh: async () => {},
});
export const useAuth = () => useContext(AuthCtx);

const COLS = "id,role,full_name,status,email,whatsapp,email_verified,whatsapp_verified";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("profiles").select(COLS).eq("id", uid).maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); setLoading(false); return; }
    // Keep the route guards waiting until the profile has loaded, so a fresh login is not bounced back to /login.
    setLoading(true);
    void loadProfile(session.user.id);
  }, [session, loadProfile]);

  const refresh = useCallback(async () => {
    if (session) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthCtx.Provider value={{ session, profile, loading, signOut, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}