'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Player, Match, LeagueData } from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { safeSetAsync, safeRemove } from '@/lib/storage';
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
  /** 서버에 이 기기보다 최신 데이터가 있음 — 동기화(pull) 전까지 업로드는 차단됨 */
  serverNewer: boolean;
  publish: () => Promise<{ success: boolean; error?: string }>;
  unpublish: () => Promise<void>;
  syncNow: () => Promise<void>;
  /** 서버 최신 데이터를 이 기기로 내려받고 새로고침 */
  pullFromServer: () => Promise<boolean>;
}

const SHARED_LEAGUE_ID_KEY = 'shared-league-id';
const SHARED_LEAGUE_PIN_KEY = 'shared-league-pin'; // 구버전 PIN 방식 잔재 정리용
// 이 기기가 마지막으로 확인한 서버 버전(updated_at). 낙관적 잠금의 기준값.
const SHARED_LEAGUE_UPDATED_AT_KEY = 'shared-league-updated-at';

export function useLeagueSync({
  leagueName,
  players,
  matches,
  seasonEnd,
}: UseLeagueSyncArgs): UseLeagueSyncReturn {
  const [sharedLeagueId, setSharedLeagueId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverNewer, setServerNewer] = useState(false);
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

  // 접속 시 서버 버전 확인: 이 기기가 마지막으로 본 버전보다 최신이면(또는 기준값이 없으면)
  // "서버와 동기화" 안내를 띄우고 업로드를 차단한다.
  useEffect(() => {
    if (!sharedLeagueId || !isConfigured || !isAdmin) return;
    const supabase = getSupabase();
    if (!supabase) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('shared_leagues')
        .select('updated_at')
        .eq('id', sharedLeagueId)
        .single();
      if (cancelled || !data) return;
      const lastKnown = localStorage.getItem(SHARED_LEAGUE_UPDATED_AT_KEY);
      // ISO(UTC) 문자열이라 사전순 비교가 시간순 비교와 같다
      if (!lastKnown || data.updated_at > lastKnown) {
        setServerNewer(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sharedLeagueId, isConfigured, isAdmin]);

  // 서버 최신 데이터를 이 기기의 편집 상태로 내려받는다
  const pullFromServer = useCallback(async (): Promise<boolean> => {
    const supabase = getSupabase();
    if (!supabase || !sharedLeagueId) return false;

    const { data, error } = await supabase
      .from('shared_leagues')
      .select('name, players, matches, season_end, updated_at')
      .eq('id', sharedLeagueId)
      .single();
    if (error || !data) {
      showToast('서버 데이터를 불러오지 못했습니다.', 'error');
      return false;
    }

    const leagueData: LeagueData = {
      name: data.name,
      players: (data.players as Player[]) || [],
      matches: (data.matches as Match[]) || [],
      seasonEnd: data.season_end || undefined,
      createdAt: new Date().toISOString(),
    };
    await safeSetAsync('current-league', leagueData);
    safeRemove('current-slot-index'); // 슬롯 데이터를 덮어쓰지 않도록 바인딩 해제
    localStorage.setItem(SHARED_LEAGUE_UPDATED_AT_KEY, data.updated_at);
    setServerNewer(false);
    // 메모리 상태를 새 데이터로 확실히 교체하기 위해 새로고침
    window.location.reload();
    return true;
  }, [sharedLeagueId, showToast]);

  const syncToSupabase = useCallback(async (leagueId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    setIsSyncing(true);
    try {
      // 쓰기 권한은 RLS가 관리자 역할로 검증.
      // 낙관적 잠금: 이 기기가 마지막으로 본 서버 버전(updated_at)일 때만 갱신 —
      // 다른 기기가 먼저 수정했다면 0행 갱신되어 덮어쓰기가 차단된다.
      const lastKnown = localStorage.getItem(SHARED_LEAGUE_UPDATED_AT_KEY);
      let query = supabase
        .from('shared_leagues')
        .update({
          name: leagueName,
          players,
          matches,
          season_end: seasonEnd || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leagueId);
      if (lastKnown) query = query.eq('updated_at', lastKnown);
      const { data, error } = await query.select('id, updated_at');

      if (!error && data && data.length > 0) {
        localStorage.setItem(SHARED_LEAGUE_UPDATED_AT_KEY, data[0].updated_at);
        lastSyncFailedRef.current = false;
      } else if (!error && lastKnown) {
        // 버전 불일치 — 다른 기기(또는 영상 등록)가 먼저 저장함
        console.warn('[sync] Version conflict: server was updated elsewhere');
        setServerNewer(true);
        if (!lastSyncFailedRef.current) {
          showToast('다른 기기에서 저장된 최신 데이터가 있어 업로드를 중단했습니다. 상단의 "서버와 동기화"를 눌러주세요.', 'warning');
        }
        lastSyncFailedRef.current = true;
      } else {
        console.warn('[sync] Failed to sync:', error);
        if (!lastSyncFailedRef.current) {
          showToast('동기화에 실패했습니다. 네트워크 또는 관리자 권한을 확인해주세요.', 'error');
        }
        lastSyncFailedRef.current = true;
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

  // 데이터 변경 시 자동 sync (debounced 2초) — 관리자만.
  // 서버에 더 최신 데이터가 있으면(pull 전) 업로드하지 않는다.
  useEffect(() => {
    if (!sharedLeagueId || !isAdmin || serverNewer) return;

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
  }, [players, matches, leagueName, sharedLeagueId, isAdmin, serverNewer]);

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
        .select('id, updated_at')
        .single();

      if (error) throw error;

      const id = data.id;
      setSharedLeagueId(id);
      localStorage.setItem(SHARED_LEAGUE_ID_KEY, id);
      localStorage.setItem(SHARED_LEAGUE_UPDATED_AT_KEY, data.updated_at);

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
    localStorage.removeItem(SHARED_LEAGUE_UPDATED_AT_KEY);
  }, [sharedLeagueId]);

  const syncNow = useCallback(async () => {
    if (!sharedLeagueId || !isAdmin || serverNewer) return;
    await syncToSupabase(sharedLeagueId);
  }, [sharedLeagueId, isAdmin, serverNewer, syncToSupabase]);

  const shareUrl = sharedLeagueId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/live?id=${sharedLeagueId}`
    : null;

  return {
    isConfigured,
    isPublished: !!sharedLeagueId,
    isSyncing,
    shareUrl,
    sharedLeagueId,
    serverNewer,
    publish,
    unpublish,
    syncNow,
    pullFromServer,
  };
}
