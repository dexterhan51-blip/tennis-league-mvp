'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, ChevronRight, Youtube, Trophy, Loader2, AlertTriangle } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Player, Match } from '@/types';

interface SharedLeagueRow {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
  updated_at: string;
}

interface RecentResult {
  leagueId: string;
  leagueName: string;
  match: Match;
}

function teamLabel(match: Match, side: 'A' | 'B'): string {
  const team = side === 'A' ? match.teamA : match.teamB;
  return [team?.man?.name, team?.woman?.name].filter(Boolean).join('·') || '미정';
}

// 회원용 홈: 서버에 공개된 리그와 최근 경기 결과를 보여준다
export default function MemberHome() {
  const { profile } = useAuth();
  const [leagues, setLeagues] = useState<SharedLeagueRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError(true);
      return;
    }
    supabase
      .from('shared_leagues')
      .select('id, name, players, matches, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(true);
        else setLeagues((data as SharedLeagueRow[]) ?? []);
      });
  }, []);

  if (error) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl border border-line p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-down mx-auto mb-4" />
          <p className="text-sm text-ink-mute">리그 정보를 불러올 수 없습니다. 네트워크를 확인해주세요.</p>
        </div>
      </main>
    );
  }

  if (!leagues) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" aria-label="로딩 중" />
      </main>
    );
  }

  const recentResults: RecentResult[] = leagues
    .flatMap((l) =>
      (l.matches || [])
        .filter((m) => m.isFinished)
        .map((m) => ({ leagueId: l.id, leagueName: l.name, match: m }))
    )
    .sort((a, b) => (b.match.date || '').localeCompare(a.match.date || ''))
    .slice(0, 5);

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface p-4 pt-8 pb-24">
      {/* 인사 영역 */}
      <div className="flex items-center gap-3 mb-8">
        <AppLogo size={44} />
        <div>
          <h1 className="text-xl font-extrabold text-ink">러브포티 테니스</h1>
          <p className="text-sm text-ink-mute">
            {profile?.name ? `${profile.name}님, 환영합니다` : '환영합니다'}
          </p>
        </div>
      </div>

      {/* 진행 중인 리그 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-ink tracking-tight mb-3 flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-accent" /> 진행 중인 리그
        </h2>
        {leagues.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line p-8 text-center">
            <p className="text-sm text-ink-mute">아직 공개된 리그가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leagues.map((league) => {
              const total = league.matches?.length ?? 0;
              const finished = league.matches?.filter((m) => m.isFinished).length ?? 0;
              return (
                <Link
                  key={league.id}
                  href={`/live?id=${league.id}`}
                  className="flex items-center justify-between bg-card rounded-2xl border border-line p-4 hover:border-accent transition-colors active:scale-[0.99]"
                >
                  <div>
                    <div className="font-bold text-ink">{league.name}</div>
                    <div className="text-xs text-ink-faint mt-0.5 tabular-nums">
                      선수 {league.players?.length ?? 0}명 · 경기 {finished}/{total}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-faint" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 최근 경기 결과 */}
      {recentResults.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink tracking-tight mb-3 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-accent" /> 최근 경기 결과
          </h2>
          <div className="space-y-2">
            {recentResults.map(({ leagueId, leagueName, match }) => (
              <div
                key={match.id}
                className="bg-card rounded-xl border border-line p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink truncate">
                      <span className={match.scoreA > match.scoreB ? 'font-bold' : ''}>
                        {teamLabel(match, 'A')}
                      </span>
                      <span className="mx-1.5 font-black text-accent tabular-nums">
                        {match.scoreA}:{match.scoreB}
                      </span>
                      <span className={match.scoreB > match.scoreA ? 'font-bold' : ''}>
                        {teamLabel(match, 'B')}
                      </span>
                    </div>
                    <Link href={`/live?id=${leagueId}`} className="text-[11px] text-ink-faint hover:text-accent">
                      {leagueName}{match.date ? ` · ${match.date}` : ''}
                    </Link>
                  </div>
                  {match.videoUrl && (
                    <a
                      href={match.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex items-center gap-1 text-xs font-bold text-down bg-down/10 border border-down/20 px-2 py-1 rounded-lg"
                      aria-label="경기 영상 보기"
                    >
                      <Youtube size={14} /> 영상
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
