'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Radio, ChevronRight, Youtube, Trophy, Loader2, AlertTriangle } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { fetchLiveSeason, fetchSeasonMatches } from '@/lib/seasonApi';
import { useAuth } from '@/contexts/AuthContext';
import type { Match, SeasonRow } from '@/types';

interface RecentResult {
  match: Match;
}

function teamLabel(match: Match, side: 'A' | 'B'): string {
  const team = side === 'A' ? match.teamA : match.teamB;
  return [team?.man?.name, team?.woman?.name].filter(Boolean).join('·') || '미정';
}

// 회원용 홈: 진행 중(live) 시즌과 최근 경기 결과를 보여준다
export default function MemberHome() {
  const { profile } = useAuth();
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await fetchLiveSeason();
        if (cancelled) return;
        if (live) {
          const seasonMatches = await fetchSeasonMatches(live.id);
          if (cancelled) return;
          setSeason(live);
          setMatches(seasonMatches);
        }
      } catch {
        if (!cancelled) setError(true);
      }
      if (!cancelled) setIsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
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

  if (!isLoaded) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" aria-label="로딩 중" />
      </main>
    );
  }

  const recentResults: RecentResult[] = matches
    .filter((m) => m.isFinished)
    .map((m) => ({ match: m }))
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

      {/* 진행 중인 시즌 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-ink tracking-tight mb-3 flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-accent" /> 진행 중인 시즌
        </h2>
        {!season ? (
          <div className="bg-card rounded-2xl border border-line p-8 text-center">
            <p className="text-sm text-ink-mute">지금은 시즌 준비 기간입니다. 새 시즌이 시작되면 여기에 표시돼요.</p>
          </div>
        ) : (
          <Link
            href="/live"
            className="flex items-center justify-between bg-card rounded-2xl border border-line p-4 hover:border-accent transition-colors active:scale-[0.99]"
          >
            <div>
              <div className="font-bold text-ink">{season.name}</div>
              <div className="text-xs text-ink-faint mt-0.5 tabular-nums">
                시즌 {season.season_no} · 선수 {season.players?.length ?? 0}명 · 경기{' '}
                {matches.filter((m) => m.isFinished).length}/{matches.length}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-faint" />
          </Link>
        )}
      </section>

      {/* 최근 경기 결과 */}
      {recentResults.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-ink tracking-tight mb-3 flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-accent" /> 최근 경기 결과
          </h2>
          <div className="space-y-2">
            {recentResults.map(({ match }) => (
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
                    <Link href="/live" className="text-[11px] text-ink-faint hover:text-accent">
                      {season?.name ?? ''}{match.date ? ` · ${match.date}` : ''}
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
