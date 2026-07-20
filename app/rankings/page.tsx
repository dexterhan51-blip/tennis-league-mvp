'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Medal, Loader2, AlertTriangle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTourRanking, collectYears, collectAllPlayers, TourLeagueSource } from '@/utils/tourRanking';
import TourRankingRow from '@/components/rankings/TourRankingRow';
import TourPlayerModal from '@/components/rankings/TourPlayerModal';
import AdminFriendlyManager from '@/components/rankings/AdminFriendlyManager';
import AdminGuestConverter from '@/components/rankings/AdminGuestConverter';
import type { FriendlyMatchRow, TourRankingEntry } from '@/types';

type YearFilter = number | 'all';

export default function RankingsPage() {
  const { isAdmin } = useAuth();
  const [mode, setMode] = useState<'view' | 'manage'>('view');
  const [leagues, setLeagues] = useState<TourLeagueSource[] | null>(null);
  const [friendly, setFriendly] = useState<FriendlyMatchRow[]>([]);
  const [friendlyTableMissing, setFriendlyTableMissing] = useState(false);
  const [error, setError] = useState(false);
  const [year, setYear] = useState<YearFilter | null>(null);
  const [selected, setSelected] = useState<{ entry: TourRankingEntry; rank: number } | null>(null);

  const loadData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError(true);
      return;
    }
    const [leaguesRes, friendlyRes] = await Promise.all([
      supabase.from('shared_leagues').select('id, name, players, matches').eq('is_active', true),
      supabase.from('friendly_matches').select('id, match_date, match'),
    ]);
    if (leaguesRes.error) {
      setError(true);
      return;
    }
    setLeagues((leaguesRes.data as TourLeagueSource[]) ?? []);
    if (friendlyRes.error) {
      // 테이블 미생성(마이그레이션 전)이어도 리그 랭킹은 동작하게 한다
      setFriendly([]);
      setFriendlyTableMissing(true);
    } else {
      setFriendly((friendlyRes.data as FriendlyMatchRow[]) ?? []);
      setFriendlyTableMissing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const years = useMemo(() => (leagues ? collectYears(leagues, friendly) : []), [leagues, friendly]);

  // 기본 연도: 올해 (데이터가 있으면), 없으면 최신 연도, 그것도 없으면 통산
  useEffect(() => {
    if (year !== null || !leagues) return;
    const now = new Date().getFullYear();
    if (years.includes(now)) setYear(now);
    else if (years.length > 0) setYear(years[0]);
    else setYear('all');
  }, [leagues, years, year]);

  const activeYear: YearFilter = year ?? 'all';

  const entries = useMemo(
    () =>
      leagues
        ? calculateTourRanking(leagues, friendly, activeYear === 'all' ? undefined : activeYear)
        : [],
    [leagues, friendly, activeYear]
  );

  const pool = useMemo(() => (leagues ? collectAllPlayers(leagues, friendly) : []), [leagues, friendly]);

  const friendlyForModal = useMemo(
    () =>
      activeYear === 'all'
        ? friendly
        : friendly.filter((f) => (f.match_date || '').startsWith(`${activeYear}-`)),
    [friendly, activeYear]
  );

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-sm text-slate-500">랭킹 정보를 불러올 수 없습니다. 네트워크를 확인해주세요.</p>
        </div>
      </div>
    );
  }

  if (!leagues) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-clay-600 animate-spin" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Medal className="w-5 h-5 text-clay-600" /> 종합 랭킹
          </h1>
          {isAdmin && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
              <button
                onClick={() => setMode('view')}
                className={`px-3 py-1.5 transition-colors touch-target ${
                  mode === 'view' ? 'bg-clay-600 text-white' : 'bg-white text-slate-500'
                }`}
              >
                보기
              </button>
              <button
                onClick={() => setMode('manage')}
                className={`px-3 py-1.5 transition-colors touch-target ${
                  mode === 'manage' ? 'bg-clay-600 text-white' : 'bg-white text-slate-500'
                }`}
              >
                관리
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {isAdmin && mode === 'manage' ? (
          <>
            {friendlyTableMissing && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
                friendly_matches 테이블이 아직 없습니다. Supabase SQL Editor에서{' '}
                <code className="font-bold">supabase-migration-friendly.sql</code>을 실행해야 친선경기
                등록이 동작합니다.
              </div>
            )}
            <AdminGuestConverter leagues={leagues} pool={pool} onConverted={loadData} />
            <AdminFriendlyManager serverPlayers={pool} friendly={friendly} onChanged={loadData} />
          </>
        ) : (
          <>
            {/* 연도 필터 칩 */}
            <div className="-mx-4 px-4 overflow-x-auto">
              <div className="flex gap-2 w-max pb-1">
                <button
                  onClick={() => setYear('all')}
                  className={`shrink-0 text-xs font-bold px-3 py-2 rounded-full border transition-colors touch-target ${
                    activeYear === 'all'
                      ? 'bg-clay-600 text-white border-clay-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-clay-300'
                  }`}
                >
                  통산
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => setYear(y)}
                    className={`shrink-0 text-xs font-bold px-3 py-2 rounded-full border transition-colors touch-target ${
                      activeYear === y
                        ? 'bg-clay-600 text-white border-clay-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-clay-300'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {entries.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
                <Medal className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">아직 집계된 경기가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, i) => (
                  <TourRankingRow
                    key={entry.playerId}
                    rank={i + 1}
                    entry={entry}
                    onSelect={() => setSelected({ entry, rank: i + 1 })}
                  />
                ))}
              </div>
            )}

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              각 리그(대회)와 친선경기의 점수를 합산한 랭킹입니다.
              <br />
              점수 = 참석 1점(하루 1회) + 승리 1점
            </p>
          </>
        )}
      </div>

      {selected && (
        <TourPlayerModal
          entry={selected.entry}
          rank={selected.rank}
          friendly={friendlyForModal}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
