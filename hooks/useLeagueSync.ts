'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Player, Match } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface UseLeagueSyncArgs {
  leagueName: string;
  players: Player[];
  matches: Match[];
  seasonEnd?: string;
}

interface UseLeagueSyncReturn {
  isConfigured: boolean;
  isPublished: boolean;
  isSyncing: boolean;
  shareUrl: string | null;
  sharedLeagueId: string | null;
  publish: () => Promise<{ success: boolean; error?: string }>;
  unpublish: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SHARED_LEAGUE_ID_KEY = 'shared-league-id';
const SHARED_LEAGUE_PIN_KEY = 'shared-league-pin'; // 구버전 PIN 방식 잔재 정리용

export function useLeagueSync({
  leagueName,
  players,
  matches,
  seasonEnd,
}: UseLeagueSyncArgs): UseLeagueSyncReturn {
  const [sharedLeagueId, setSharedLeagueId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncFailedRef = useRef(false);
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const isConfigured = isSupabaseConfigured();

  // 저장된 공유 상태 복원 (+ 구버전 PIN 키 제거)
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(SHARED_LEAGUE_ID_KEY);
      if (savedId) setSharedLeagueId(savedId);
      localStorage.removeItem(SHARED_LEAGUE_PIN_KEY);
    } catch { /* ignore */ }
  }, []);

  const syncToSupabase = useCallback(async (leagueId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    setIsSyncing(true);
    try {
      // 쓰기 권한은 RLS가 관리자 역할로 검증. .select()로 실제 갱신된 행을 확인
      const { data, error } = await supabase
        .from('shared_leagues')
        .update({
          name: leagueName,
          players,
          matches,
          season_end: seasonEnd || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leagueId)
        .select('id');

      if (error || !data || data.length === 0) {
        console.warn('[sync] Failed to sync:', error);
        if (!lastSyncFailedRef.current) {
          showToast('동기화에 실패했습니다. 네트워크 또는 관리자 권한을 확인해주세요.', 'error');
        }
        lastSyncFailedRef.current = true;
      } else {
        lastSyncFailedRef.current = false;
      }
    } catch (e) {
      console.warn('[sync] Failed to sync:', e);
      if (!lastSyncFailedRef.current) {
        showToast('동기화에 실패했습니다. 변경사항이 회원들에게 보이지 않을 수 있어요.', 'error');
      }
      lastSyncFailedRef.current = true;
    } finally {
      setIsSyncing(false);
    }
  }, [leagueName, players, matches, seasonEnd, showToast]);

  // 데이터 변경 시 자동 sync (debounced 2초) — 관리자만
  useEffect(() => {
    if (!sharedLeagueId || !isAdmin) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToSupabase(sharedLeagueId);
    }, 2000);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, matches, leagueName, sharedLeagueId, isAdmin]);

  const publish = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Supabase가 설정되지 않았습니다.' };

    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('shared_leagues')
        .insert({
          name: leagueName,
          players,
          matches,
          season_end: seasonEnd || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      const id = data.id;
      setSharedLeagueId(id);
      localStorage.setItem(SHARED_LEAGUE_ID_KEY, id);

      return { success: true };
    } catch (e: any) {
      console.error('[sync] Publish failed:', e);
      return { success: false, error: e.message || '온라인 공개에 실패했습니다. 관리자 권한을 확인해주세요.' };
    } finally {
      setIsSyncing(false);
    }
  }, [leagueName, players, matches, seasonEnd]);

  const unpublish = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !sharedLeagueId) return;

    try {
      await supabase
        .from('shared_leagues')
        .update({ is_active: false })
        .eq('id', sharedLeagueId);
    } catch (e) {
      console.warn('[sync] Unpublish failed:', e);
    }

    setSharedLeagueId(null);
    localStorage.removeItem(SHARED_LEAGUE_ID_KEY);
  }, [sharedLeagueId]);

  const syncNow = useCallback(async () => {
    if (!sharedLeagueId || !isAdmin) return;
    await syncToSupabase(sharedLeagueId);
  }, [sharedLeagueId, isAdmin, syncToSupabase]);

  const shareUrl = sharedLeagueId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/live?id=${sharedLeagueId}`
    : null;

  return {
    isConfigured,
    isPublished: !!sharedLeagueId,
    isSyncing,
    shareUrl,
    sharedLeagueId,
    publish,
    unpublish,
    syncNow,
  };
}
