'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import ScoreRow from '@/components/match/ScoreRow';
import { matchesOf, standingOf } from '@/utils/playerInsights';
import type { Scope } from '@/lib/clubView';

interface TodayViewProps {
  /** 진행 중 시즌 또는 올해 전체 경기. 아무 기록도 없으면 null */
  scope: Scope | null;
  /** 로그인한 회원과 연결된 선수 id (연결 전이면 null) */
  myPlayerId: string | null;
  displayName: string;
  isDemo?: boolean;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-extrabold tracking-[0.08em] text-ink-mute uppercase">{children}</span>;
}

/** 오늘(홈): 내 순위를 가장 크게, 그 아래 진행 중 경기 → 내 최근 경기 → 시즌 상위권 */
export default function TodayView({ scope, myPlayerId, displayName, isDemo }: TodayViewProps) {
  if (!scope) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-6 pb-24">
        <Eyebrow>러브포티</Eyebrow>
        <h1 className="mt-3 text-[22px] font-extrabold tracking-tight text-ink">아직 기록된 경기가 없습니다</h1>
        <p className="mt-2 text-sm text-ink-mute">첫 경기를 기록하면 순위와 경기가 여기에 표시돼요.</p>
        <Link href="/admin" className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-accent">
          운영 화면으로 <ChevronRight className="w-4 h-4" />
        </Link>
      </main>
    );
  }

  const { players, matches } = scope;
  const { table, rank, stat, change, gapAbove } = standingOf(players, matches, myPlayerId);
  const matchDays = new Set(matches.filter((m) => m.isFinished).map((m) => m.date)).size;
  const liveMatches = matches.filter((m) => !m.isFinished && ((m.pointLog?.length ?? 0) > 0 || m.scoreA > 0 || m.scoreB > 0));
  const myRecent = myPlayerId ? matchesOf(matches, myPlayerId).slice(0, 3) : [];
  const latest = [...matches].filter((m) => m.isFinished).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const top = table.slice(0, 3);

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <Eyebrow>
          {scope.label}
          {matchDays > 0 && ` · ${scope.kind === 'season' ? `${matchDays}일차` : `모임 ${matchDays}번`}`}
        </Eyebrow>
        {displayName && (
          <span className="text-[11px] font-extrabold px-2 py-1 rounded-md bg-card-soft text-ink-soft">{displayName} 님</span>
        )}
      </div>
      {isDemo && (
        <p className="mt-2 text-[11px] font-bold text-down">예시 데이터입니다 — 서버가 연결되지 않은 개발 환경</p>
      )}

      {/* 내 순위 */}
      {rank !== null && stat ? (
        <>
          <div className="mt-4 grid grid-cols-[auto_1fr] items-end gap-x-[18px] pb-[18px] border-b border-line">
            <div className="num text-[104px] font-black leading-[0.82] tracking-[-0.06em] text-ink">
              {rank}
              <span className="text-[26px] font-extrabold tracking-tight ml-0.5">위</span>
            </div>
            <div className="pb-1.5 text-[13px] leading-[1.7] text-ink-soft">
              {change !== null && (
                <div>
                  지난 모임보다{' '}
                  {change > 0 ? (
                    <b className="text-up font-extrabold">▲ {change}</b>
                  ) : change < 0 ? (
                    <b className="text-down font-extrabold">▼ {-change}</b>
                  ) : (
                    <b className="text-ink font-extrabold">변동 없음</b>
                  )}
                </div>
              )}
              {gapAbove !== null && (
                <div>
                  {rank - 1}위와 <b className="num text-ink font-extrabold">{gapAbove}점</b> 차
                </div>
              )}
              <div>{table.length}명 중</div>
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-4">
            {[
              { v: stat.totalPoints, l: '점수' },
              { v: stat.wins, l: '승' },
              { v: `${Math.round(stat.winRate)}%`, l: '승률' },
              { v: stat.mvpCount ?? 0, l: 'MVP' },
            ].map((k, i) => (
              <div key={k.l} className={i === 0 ? '' : 'border-l border-line pl-2.5'}>
                <b className="num block text-[22px] font-extrabold text-ink">{k.v}</b>
                <span className="text-[11px] font-semibold text-ink-mute">{k.l}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 pb-[18px] border-b border-line">
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{scope.name}</h1>
          <p className="mt-1.5 text-[13px] text-ink-mute">
            {myPlayerId
              ? '아직 뛴 경기가 없어요. 첫 경기를 치르면 순위가 표시됩니다.'
              : '「나」 탭에서 내 이름을 고르면 여기에 내 순위가 크게 표시됩니다.'}
          </p>
        </div>
      )}

      {liveMatches.length > 0 && (
        <section className="mt-[22px]">
          <div className="mb-2.5"><Eyebrow>지금 코트</Eyebrow></div>
          <div className="space-y-2">
            {liveMatches.map((m) => (
              <ScoreRow key={m.id} match={m} label="진행 중" highlightPlayerId={myPlayerId ?? undefined} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-[22px]">
        <div className="flex items-center justify-between mb-2.5">
          <Eyebrow>{myRecent.length > 0 ? '내 최근 경기' : '최근 경기'}</Eyebrow>
          <Link href={myRecent.length > 0 ? '/me' : '/live'} className="text-xs font-bold text-ink-mute">
            전체 ›
          </Link>
        </div>
        {(myRecent.length > 0 ? myRecent : latest).length === 0 ? (
          <p className="text-sm text-ink-mute">아직 끝난 경기가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {(myRecent.length > 0 ? myRecent : latest).map((m) => (
              <ScoreRow key={m.id} match={m} highlightPlayerId={myPlayerId ?? undefined} />
            ))}
          </div>
        )}
      </section>

      {top.length > 0 && (
        <section className="mt-[22px]">
          <div className="flex items-center justify-between mb-1">
            <Eyebrow>{scope.kind === 'season' ? '시즌 상위권' : '올해 상위권'}</Eyebrow>
            <Link href="/rankings" className="text-xs font-bold text-ink-mute">
              랭킹 ›
            </Link>
          </div>
          {top.map((s, i) => (
            <div
              key={s.playerId}
              className={`flex items-center h-11 border-b border-line text-sm ${s.playerId === myPlayerId ? 'font-extrabold text-ink' : 'font-semibold text-ink-soft'}`}
            >
              <span className="num w-7 text-[17px] font-black text-ink">{i + 1}</span>
              <span className="flex-1 truncate">{s.name}</span>
              <span className="num text-xs text-ink-mute mr-3">
                {s.wins}승 {s.losses}패
              </span>
              <span className="num text-[18px] font-extrabold text-ink">{s.totalPoints}</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
