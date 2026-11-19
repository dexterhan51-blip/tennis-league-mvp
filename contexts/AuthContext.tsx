'use client';

// 로그인 없는 공개 앱의 "누구인지" 정보.
// · 순위·경기 기록은 누구나 본다 (세션 개념 없음)
// · 운영진: 운영진 코드를 한 번 입력하면 이 기기에 저장되고, 쓰기 요청마다 서버가 다시 확인한다
// · 내 선수: 선수 명단에서 고른 이름을 이 기기에 저장해 "내 순위"를 보여준다 (서버에 보내지 않음)

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ApiError, apiPost, getAdminCode, isDemoMode, setAdminCode } from '@/lib/backend';

export interface Profile {
  name: string;
  role: 'admin' | 'member';
  player_id: string | null;
}

interface AuthContextValue {
  profile: Profile;
  isAdmin: boolean;
  /** 기기에 저장된 값(운영진 코드·내 선수)을 아직 읽는 중 */
  isLoading: boolean;
  /** 서버를 쓰는 실제 앱인지 (예시 모드면 false) */
  isConfigured: boolean;
  /** 운영진 코드 확인 */
  signIn: (code: string) => Promise<{ success: boolean; error?: string }>;
  /** 운영진 모드 끄기 */
  signOut: () => void;
  /** "나"로 삼을 선수 고르기 (null 이면 해제) */
  setMyPlayer: (player: { id: string; name: string } | null) => void;
}

const MY_PLAYER_KEY = 'lf-my-player';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [myPlayer, setMyPlayerState] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = !isDemoMode();

  // 기기에 저장된 값 복원 (서버 렌더와 첫 화면이 어긋나지 않도록 마운트 뒤에 읽는다)
  useEffect(() => {
    let saved: { id: string; name: string } | null = null;
    try {
      const raw = localStorage.getItem(MY_PLAYER_KEY);
      const parsed = raw ? (JSON.parse(raw) as { id?: unknown; name?: unknown }) : null;
      if (parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string') {
        saved = { id: parsed.id, name: parsed.name };
      }
    } catch {
      saved = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 기기 저장값은 마운트 뒤에만 읽을 수 있다
    setMyPlayerState(saved);
    setIsAdmin(!!getAdminCode());
    setIsLoading(false);
  }, []);

  const signIn = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return { success: false, error: '운영진 코드를 입력해주세요.' };
    try {
      await apiPost({ op: 'verify' }, trimmed);
      setAdminCode(trimmed);
      setIsAdmin(true);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof ApiError ? e.message : '서버에 연결할 수 없습니다.' };
    }
  }, []);

  const signOut = useCallback(() => {
    setAdminCode(null);
    setIsAdmin(false);
  }, []);

  const setMyPlayer = useCallback((player: { id: string; name: string } | null) => {
    setMyPlayerState(player);
    try {
      if (player) localStorage.setItem(MY_PLAYER_KEY, JSON.stringify(player));
      else localStorage.removeItem(MY_PLAYER_KEY);
    } catch {
      // 저장이 막힌 브라우저에서는 이번 접속 동안만 유지된다
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        profile: { name: myPlayer?.name ?? '', role: isAdmin ? 'admin' : 'member', player_id: myPlayer?.id ?? null },
        isAdmin,
        isLoading,
        isConfigured,
        signIn,
        signOut,
        setMyPlayer,
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
