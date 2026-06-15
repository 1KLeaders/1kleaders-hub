'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, DbProfile } from '@/lib/supabase';
import type { DashboardRole } from '@/components/1k-leaders/types';

interface AuthContextValue {
  session:        Session | null;
  user:           User | null;
  profile:        DbProfile | null;
  role:           DashboardRole;        // real role from DB
  devViewRole:    DashboardRole;        // developer role-switcher override
  setDevViewRole: (r: DashboardRole) => void;
  isDeveloper:    boolean;
  loading:        boolean;
  signIn:         (email: string, password: string) => Promise<{ error: string | null }>;
  signOut:        () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,     setSession]     = useState<Session | null>(null);
  const [user,        setUser]        = useState<User | null>(null);
  const [profile,     setProfile]     = useState<DbProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [devViewRole, setDevViewRole] = useState<DashboardRole>('shareholder');

  const isDeveloper = profile?.role === 'developer';
  // Developers see the devViewRole; everyone else sees their real DB role
  const role: DashboardRole = isDeveloper
    ? devViewRole
    : (profile?.role as DashboardRole) ?? 'user';

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as DbProfile);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, role, devViewRole, setDevViewRole,
      isDeveloper, loading, signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
