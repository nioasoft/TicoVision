import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/user-role';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  tenantId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Handle any session/refresh token errors
      if (error) {
        console.error('Session error:', error.message);
        // Clear all session data from storage
        localStorage.removeItem('supabase.auth.token');
        // Sign out to ensure clean state
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setRole(null);
        setTenantId(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        setRole(session?.user?.user_metadata?.role ?? null);
        setTenantId(session?.user?.user_metadata?.tenant_id ?? null);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Auth initialization error:', error);
      // Clear session on any error
      localStorage.removeItem('supabase.auth.token');
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle failed token refresh
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed - clearing session');
        localStorage.removeItem('supabase.auth.token');
      }

      // Handle signed out event
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('supabase.auth.token');
      }

      setSession(session);
      setUser(session?.user ?? null);
      setRole(session?.user?.user_metadata?.role ?? null);
      setTenantId(session?.user?.user_metadata?.tenant_id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const value = {
    user,
    session,
    role,
    tenantId,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}