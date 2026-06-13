'use client';

import { useState, useEffect, useCallback } from 'react';
import { Player, Match, SharedLeague } from '@/types';
import { calculateRanking } from '@/utils/tennisLogic';
import { getSupabase } from '@/lib/supabase';
import type { PlayerStat } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface LiveDashboardData {
  leagueName: string;
  players: Player[];
  matches: Match[];
  rankings: PlayerStat[];
  seasonEnd?: string;
  updatedAt: string;
  connectionStatus: ConnectionStatus;
  error: string | null;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  matchDates: string[];
  todayMatches: Match[];
  todayFinished: number;
  todayTotal: number;
}

export function useLiveDashboard(leagueId: string): LiveDashboardData {
  const [leagueName, setLeagueName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [seasonEnd, setSeasonEnd] = useState<string | undefined>();
  const [updatedAt, setUpdatedAt] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const applyData = useCallback((data: SharedLeague) => {
    setLeagueName(data.name);
    setPlayers(data.players || []);
    setMatches(data.matches || []);
    setSeasonEnd(data.season_end || undefined);
    setUpdatedAt(data.updated_at);
  }, []);

  // 초기 로드 + 실시간 구독
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('서비스가 설정되지 않았습니다.');
      setConnectionStatus('error');
      return;
    }

    let channel: RealtimeChannel | null = null;

    async function init() {
      try {
        // 1. 초기 데이터 로드 — pin_code는 가져오지 않는다 (열람자에게 PIN 노출 방지)
        const { data, error: fetchError } = await supabase!
          .from('shared_leagues')
          .select('id, name, players, matches, season_end, created_at, updated_at, is_active')
          .eq('id', leagueId)
          .eq('is_active', true)
          .single();

        if (fetchError || !data) {
          console.warn('[live] Fetch error:', fetchError);
          setError('리그를 찾을 수 없습니다.');
          setConnectionStatus('error');
          return;
        }

        applyData(data as SharedLeague);
        setConnectionStatus('connected');

        // 2. 실시간 구독
        channel = supabase!
          .channel(`league-${leagueId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'shared_leagues',
              filter: `id=eq.${leagueId}`,
            },
            (payload) => {
              const newData = payload.new as SharedLeague;
              if (newData.is_active) {
                applyData(newData);
              } else {
                setError('리그가 비활성화되었습니다.');
                setConnectionStatus('disconnected');
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setConnectionStatus('connected');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setConnectionStatus('disconnected');
            }
          });
      } catch (e) {
        console.error('[live] Init error:', e);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        setConnectionStatus('error');
      }
    }

    init();

    return () => {
      if (channel) {
        const supabase = getSupabase();
        supabase?.removeChannel(channel);
      }
    };
  }, [leagueId, applyData]);

  // 랭킹 계산 (안전하게)
  let rankings: PlayerStat[] = [];
  try {
    rankings = calculateRanking(players, matches);
  } catch (e) {
    console.warn('[live] Ranking calculation error:', e);
  }

  // 날짜별 데이터
  const matchDates = [...new Set(matches.map(m => m.date))].sort().reverse();
  const todayMatches = matches.filter(m => m.date === selectedDate);
  const todayFinished = todayMatches.filter(m => m.isFinished).length;
  const todayTotal = todayMatches.length;

  return {
    leagueName,
    players,
    matches,
    rankings,
    seasonEnd,
    updatedAt,
    connectionStatus,
    error,
    selectedDate,
    setSelectedDate,
    matchDates,
    todayMatches,
    todayFinished,
    todayTotal,
  };
}
