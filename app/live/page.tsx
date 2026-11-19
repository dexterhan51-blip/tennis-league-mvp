'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, Loader2 } from 'lucide-react';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { LiveRanking } from '@/components/live/LiveRanking';
import { PlayerAvatar } from '@/components/live/PlayerAvatar';
import ScoreRow from '@/components/match/ScoreRow';
import { FullError, FullLoading } from '@/components/ui/DataState';
import { isDemoMode } from '@/lib/backend';
import { DEMO_MY_PLAYER_ID } from '@/lib/demoData';
import { calculateDailyMvp } from '@/utils/tennisLogic';
import { useClubData } from '@/hooks/useClubData';
import { countableMatches, photoMap, rankedPlayers } from '@/lib/clubView';
import type { Match, Player } from '@/types';

// /live       → 진행 중(live) 시즌 자동 표시
// /live?id=…  → 특정 시즌(아카이브 포함) 열람
function LiveDashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return id ? <LiveDashboardView seasonId={id} /> : <AllMatchesView />;
}

interface DayViewProps {
  eyebrow: string;
  archived: boolean;
  isDemo: boolean;
  isAdmin: boolean;
  myPlayerId: string | null;
  players: Player[];
  photoOf: Map<string, string | undefined>;
  /** 순위에 들어가는 형태의 경기(그날 경기의 친선 표시를 뗀 것) */
  matches: Match[];
  connected: boolean | null;
  finalRanking?: React.ReactNode;
}

// 기본 화면: 시즌 경기와 그날그날 경기를 가리지 않고 날짜별로 본다
function AllMatchesView() {
  const { data, status, isDemo } = useClubData(true);
  const { profile, isAdmin } = useAuth();
  if (status === 'loading') return <FullLoading />;
  if (status === 'error' || !data) return <FullError message="경기 기록을 불러올 수 없습니다. 네트워크를 확인해주세요." />;
  const matches = countableMatches(data);
  return (
    <DayView
      eyebrow="러브포티 경기 기록"
      archived={false}
      isDemo={isDemo}
      isAdmin={isAdmin}
      myPlayerId={isDemo ? DEMO_MY_PLAYER_ID : profile.player_id}
      players={rankedPlayers(data, matches)}
      photoOf={photoMap(data)}
      matches={matches}
      connected={isDemo ? null : true}
    />
  );
}

function formatMonth(date: string): string {
  const [y, m] = date.split('-');
  return m ? `${y}년 ${Number(m)}월` : '';
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 경기일 띠: 오래된 날 → 최근 날, 처음엔 가장 최근 날이 보이도록 오른쪽 끝으로 스크롤 */
function DateStrip({ dates, selected, onSelect }: { dates: string[]; selected: string; onSelect: (d: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
  }, [dates.length]);

  return (
    <div ref={ref} className="mt-3.5 -mx-5 px-5 overflow-x-auto scrollbar-hide">
      <div className="flex gap-1.5 w-max min-w-full">
        {dates.map((date) => {
          const d = new Date(`${date}T00:00:00`);
          const on = date === selected;
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              aria-pressed={on}
              aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일`}
              className={`w-[58px] shrink-0 pt-2 pb-2 rounded-xl text-center text-[11px] font-bold transition-colors ${
                on ? 'bg-ink text-surface' : 'text-ink-mute'
              }`}
            >
              {d.getMonth() + 1}월 {WEEKDAYS[d.getDay()]}
              <b className={`num block mt-0.5 text-lg font-extrabold ${on ? 'text-surface' : 'text-ink-soft'}`}>{d.getDate()}</b>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LiveDashboardView({ seasonId }: { seasonId: string | null }) {
  const dashboard = useLiveDashboard(seasonId);
  const { profile, isAdmin } = useAuth();
  const isDemo = isDemoMode();
  const myPlayerId = isDemo ? DEMO_MY_PLAYER_ID : profile.player_id;

  if (dashboard.noLiveSeason) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-6 pb-24">
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">경기</h1>
        <p className="mt-2 text-sm text-ink-mute">진행 중인 시즌이 없습니다. 새 시즌이 시작되면 여기에서 실시간으로 볼 수 있어요.</p>
        <Link href="/rankings" className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-accent">
          지난 시즌 보기 <ChevronRight className="w-4 h-4" />
        </Link>
      </main>
    );
  }

  if (dashboard.error) return <FullError message={dashboard.error} />;
  if (dashboard.connectionStatus === 'connecting' && !dashboard.leagueName) return <FullLoading />;

  return (
    <DayView
      eyebrow={`${dashboard.leagueName}${dashboard.seasonStatus === 'archived' ? ' · 종료된 시즌' : ''}`}
      archived={dashboard.seasonStatus === 'archived'}
      isDemo={isDemo}
      isAdmin={isAdmin}
      myPlayerId={myPlayerId}
      players={dashboard.players}
      photoOf={new Map(dashboard.players.map((p) => [p.id, p.photo]))}
      matches={dashboard.matches}
      connected={dashboard.seasonStatus === 'archived' ? null : dashboard.connectionStatus === 'connected'}
      finalRanking={
        dashboard.seasonStatus === 'archived' ? <LiveRanking rankings={dashboard.rankings} players={dashboard.players} /> : undefined
      }
    />
  );
}

function DayView({ eyebrow, archived, isDemo, isAdmin, myPlayerId, players, photoOf, matches, connected, finalRanking }: DayViewProps) {
  const dates = [...new Set(matches.map((m) => m.date))].sort();
  const [picked, setPicked] = useState<string | null>(null);
  // 고른 날이 없으면(또는 그날 경기가 지워졌으면) 가장 최근 경기일
  const effectiveDate = picked && dates.includes(picked) ? picked : dates[dates.length - 1] ?? '';
  const dayMatches = matches.filter((m) => m.date === effectiveDate);
  const finished = dayMatches.filter((m) => m.isFinished).length;

  let mvps: { id: string; name: string; gender: string; wins: number; played: number; scoreDiff: number }[] = [];
  try {
    const { maleMvp, femaleMvp } = calculateDailyMvp(players, matches, effectiveDate);
    mvps = [maleMvp, femaleMvp].filter((m): m is NonNullable<typeof m> => m !== null);
  } catch (e) {
    console.warn('[live] MVP calculation error:', e);
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-6 pb-24">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[11px] font-extrabold tracking-[0.08em] text-ink-mute truncate">{eyebrow}</span>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">{formatMonth(effectiveDate) || '경기'}</h1>
        </div>
        <Link href="/videos" className="shrink-0 pb-1 text-xs font-bold text-ink-mute">
          영상 달력 ›
        </Link>
      </div>
      {isDemo && <p className="mt-2 text-[11px] font-bold text-down">예시 데이터입니다 — 서버가 연결되지 않은 개발 환경</p>}

      {dates.length === 0 ? (
        <p className="mt-6 text-sm text-ink-mute">아직 등록된 경기가 없습니다.</p>
      ) : (
        <>
          <DateStrip dates={dates} selected={effectiveDate} onSelect={setPicked} />

          {mvps.length > 0 && (
            <div className="mt-3.5 border-y border-line divide-y divide-line">
              {mvps.map((mvp) => (
                <div key={mvp.id} className="flex items-center gap-3 py-2.5">
                  <PlayerAvatar
                    photo={photoOf.get(mvp.id)}
                    gender={mvp.gender === 'FEMALE' ? 'FEMALE' : 'MALE'}
                    name={mvp.name}
                    sizeClass="w-10 h-10"
                    emojiClass="text-[15px]"
                  />
                  <div className="min-w-0 flex-1">
                    <b className="block text-[15px] font-extrabold text-ink truncate">{mvp.name}</b>
                    <span className="num block text-xs text-ink-mute">
                      {mvp.wins}승 {mvp.played - mvp.wins}패 · 득실 {mvp.scoreDiff > 0 ? '+' : ''}
                      {mvp.scoreDiff}
                    </span>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-md bg-accent text-accent-ink text-[11px] font-extrabold">
                    {mvp.gender === 'FEMALE' ? '여자' : '남자'} MVP
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 mb-2.5 flex items-center justify-between text-[11px] font-extrabold tracking-[0.08em] text-ink-mute">
            <span className="num">
              경기 {finished}/{dayMatches.length}
            </span>
            {connected !== null && <span className={connected ? 'text-up' : ''}>{connected ? '● 실시간' : '실시간 연결 끊김'}</span>}
          </div>
          <div className="space-y-2">
            {dayMatches.map((m, i) => (
              <ScoreRow key={m.id} match={m} label={`${i + 1}경기`} highlightPlayerId={myPlayerId ?? undefined} />
            ))}
          </div>

          {isAdmin && !archived && (
            <Link
              href={`/session?date=${effectiveDate}`}
              className="mt-4 flex items-center justify-center h-12 rounded-[14px] bg-card-soft text-sm font-bold text-ink-soft"
            >
              이 날 기록 고치기
            </Link>
          )}

          {/* 종료된 시즌을 열람할 때는 최종 순위도 함께 보여준다 */}
          {finalRanking && <div className="mt-6">{finalRanking}</div>}
        </>
      )}
    </main>
  );
}

export default function LiveDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    }>
      <LiveDashboardContent />
    </Suspense>
  );
}
