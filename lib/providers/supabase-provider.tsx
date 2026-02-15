'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { AuthError, AuthResponse, AuthTokenResponsePassword, Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type SupabaseContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthTokenResponsePassword>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<{ error: AuthError | null }>;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      setIsLoading(true);
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    };

    void initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      if (!isMounted) return;
      setSession(updatedSession);
      setUser(updatedSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({ email, password });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}; 