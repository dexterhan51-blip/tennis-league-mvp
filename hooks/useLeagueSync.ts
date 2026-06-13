'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Player, Match, SharedLeague } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';

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
  publish: (pinCode: string) => Promise<{ success: boolean; error?: string }>;
  unpublish: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const SHARED_LEAGUE_ID_KEY = 'shared-league-id';
const SHARED_LEAGUE_PIN_KEY = 'shared-league-pin';

export function useLeagueSync({
  leagueName,
  players,
  matches,
  seasonEnd,
}: UseLeagueSyncArgs): UseLeagueSyncReturn {
  const [sharedLeagueId, setSharedLeagueId] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncFailedRef = useRef(false);
  const { showToast } = useToast();
  const isConfigured = isSupabaseConfigured();

  // 저장된 공유 상태 복원
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(SHARED_LEAGUE_ID_KEY);
      const savedPin = localStorage.getItem(SHARED_LEAGUE_PIN_KEY);
      if (savedId) setSharedLeagueId(savedId);
      if (savedPin) setPinCode(savedPin);
    } catch { /* ignore */ }
  }, []);

  // 데이터 변경 시 자동 sync (debounced 2초)
  useEffect(() => {
    if (!sharedLeagueId || !pinCode) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToSupabase(sharedLeagueId, pinCode);
    }, 2000);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players, matches, leagueName, sharedLeagueId, pinCode]);

  const syncToSupabase = useCallback(async (leagueId: string, pin: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    setIsSyncing(true);
    try {
      // .select()로 실제 갱신된 행을 확인 — PIN 불일치 시 0행 갱신은 에러가 아니므로 직접 검증해야 함
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
        .eq('pin_code', pin)
        .select('id');

      if (error || !data || data.length === 0) {
        console.warn('[sync] Failed to sync:', error);
        if (!lastSyncFailedRef.current) {
          showToast('실시간 공유 동기화에 실패했습니다. 네트워크 또는 PIN을 확인해주세요.', 'error');
        }
        lastSyncFailedRef.current = true;
      } else {
        lastSyncFailedRef.current = false;
      }
    } catch (e) {
      console.warn('[sync] Failed to sync:', e);
      if (!lastSyncFailedRef.current) {
        showToast('실시간 공유 동기화에 실패했습니다. 변경사항이 친구들에게 보이지 않을 수 있어요.', 'error');
      }
      lastSyncFailedRef.current = true;
    } finally {
      setIsSyncing(false);
    }
  }, [leagueName, players, matches, seasonEnd, showToast]);

  const publish = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Supabase가 설정되지 않았습니다.' };

    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('shared_leagues')
        .insert({
          name: leagueName,
          pin_code: pin,
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
      setPinCode(pin);
      localStorage.setItem(SHARED_LEAGUE_ID_KEY, id);
      localStorage.setItem(SHARED_LEAGUE_PIN_KEY, pin);

      return { success: true };
    } catch (e: any) {
      console.error('[sync] Publish failed:', e);
      return { success: false, error: e.message || '공유에 실패했습니다.' };
    } finally {
      setIsSyncing(false);
    }
  }, [leagueName, players, matches, seasonEnd]);

  const unpublish = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !sharedLeagueId || !pinCode) return;

    try {
      await supabase
        .from('shared_leagues')
        .update({ is_active: false })
        .eq('id', sharedLeagueId)
        .eq('pin_code', pinCode);
    } catch (e) {
      console.warn('[sync] Unpublish failed:', e);
    }

    setSharedLeagueId(null);
    setPinCode(null);
    localStorage.removeItem(SHARED_LEAGUE_ID_KEY);
    localStorage.removeItem(SHARED_LEAGUE_PIN_KEY);
  }, [sharedLeagueId, pinCode]);

  const syncNow = useCallback(async () => {
    if (!sharedLeagueId || !pinCode) return;
    await syncToSupabase(sharedLeagueId, pinCode);
  }, [sharedLeagueId, pinCode, syncToSupabase]);

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
