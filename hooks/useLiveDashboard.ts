'use client';

import { useState, useEffect, useCallback } from 'react';
import { Player, Match, SeasonRow } from '@/types';
import { calculateRanking } from '@/utils/tennisLogic';
import {
  fetchLiveSeason,
  fetchSeasonById,
  fetchSeasonMatches,
  subscribeLiveSeason,
  isMissingTableError,
} from '@/lib/seasonApi';
import type { PlayerStat } from '@/types';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface LiveDashboardData {
  leagueName: string;
  seasonNo: number | null;
  seasonStatus: SeasonRow['status'] | null;
  players: Player[];
  matches: Match[];
  rankings: PlayerStat[];
  updatedAt: string;
  connectionStatus: ConnectionStatus;
  error: string | null;
  /** 진행 중인 시즌이 없음 (에러 아님) */
  noLiveSeason: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  matchDates: string[];
  todayMatches: Match[];
  todayFinished: number;
  todayTotal: number;
}

/**
 * 라이브 대시보드 데이터.
 * @param seasonId 지정하면 해당 시즌(아카이브 포함), 없으면 진행 중(live) 시즌을 보여준다.
 */
export function useLiveDashboard(seasonId?: string | null): LiveDashboardData {
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [noLiveSeason, setNoLiveSeason] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const upsertMatch = useCallback((match: Match) => {
    setMatches((prev) => {
      const idx = prev.findIndex((m) => m.id === match.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = match;
        return next;
      }
      return [...prev, match];
    });
    setUpdatedAt(new Date().toISOString());
  }, []);

  const removeMatch = useCallback((matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    setUpdatedAt(new Date().toISOString());
  }, []);

  // 초기 로드 + 실시간 구독 (경기 행 단위라 갱신이 즉각적이고 충돌이 없다)
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function init() {
      try {
        const row = seasonId ? await fetchSeasonById(seasonId) : await fetchLiveSeason();
        if (cancelled) return;
        if (!row) {
          if (seasonId) {
            setError('시즌을 찾을 수 없습니다.');
            setConnectionStatus('error');
          } else {
            setNoLiveSeason(true);
            setConnectionStatus('connected');
          }
          return;
        }
        const seasonMatches = await fetchSeasonMatches(row.id);
        if (cancelled) return;
        setSeason(row);
        setMatches(seasonMatches);
        setUpdatedAt(row.updated_at);
        setConnectionStatus('connected');

        // 아카이브 시즌은 더 이상 변하지 않으므로 live만 구독
        if (row.status === 'live') {
          unsubscribe = subscribeLiveSeason(row.id, {
            onMatchUpsert: upsertMatch,
            onMatchDelete: removeMatch,
            onSeasonChange: (next) => {
              setSeason(next);
              setUpdatedAt(next.updated_at);
              if (next.status !== 'live') setConnectionStatus('disconnected');
            },
            onStatus: (status) =>
              setConnectionStatus(status === 'connected' ? 'connected' : 'disconnected'),
          });
        }
      } catch (e) {
        if (cancelled) return;
        console.warn('[live] Init error:', e);
        setError(
          isMissingTableError(e)
            ? '서버 마이그레이션이 필요합니다. 관리자에게 문의하세요.'
            : '데이터를 불러오는 중 오류가 발생했습니다.'
        );
        setConnectionStatus('error');
      }
    }

    init();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [seasonId, upsertMatch, removeMatch]);

  const players = season?.players ?? [];

  // 랭킹 계산 (안전하게)
  let rankings: PlayerStat[] = [];
  try {
    rankings = calculateRanking(players, matches);
  } catch (e) {
    console.warn('[live] Ranking calculation error:', e);
  }

  // 날짜별 데이터
  const matchDates = [...new Set(matches.map((m) => m.date))].sort().reverse();
  const todayMatches = matches.filter((m) => m.date === selectedDate);
  const todayFinished = todayMatches.filter((m) => m.isFinished).length;
  const todayTotal = todayMatches.length;

  return {
    leagueName: season?.name ?? '',
    seasonNo: season?.season_no ?? null,
    seasonStatus: season?.status ?? null,
    players,
    matches,
    rankings,
    updatedAt,
    connectionStatus,
    error,
    noLiveSeason,
    selectedDate,
    setSelectedDate,
    matchDates,
    todayMatches,
    todayFinished,
    todayTotal,
  };
}
