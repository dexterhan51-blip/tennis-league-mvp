'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export interface Profile {
  id: string;
  name: string;
  role: 'admin' | 'member';
  player_id: string | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // 세션이 생기면 프로필(역할) 로드
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !session) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role, player_id')
        .eq('id', session.user.id)
        .single();
      if (!cancelled) {
        setProfile((data as Profile) ?? null);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: '서버 연결이 설정되지 않았습니다.' };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.includes('Invalid login credentials')
        ? '아이디 또는 비밀번호가 올바르지 않습니다.'
        : error.message;
      return { success: false, error: msg };
    }
    return { success: true };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isAdmin: profile?.role === 'admin',
        isLoading,
        isConfigured,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.');
  return ctx;
}
