'use client';

import Link from 'next/link';
import { CalendarDays, ChevronRight, MapPin, Play } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { PlayerAvatar } from '@/components/live/PlayerAvatar';
import { latestStrip, leaders, recentMeetings, topRanked, upcomingSchedule } from '@/lib/clubHome';
import { currentScope, photoMap, type ClubData } from '@/lib/clubView';
import { longDate, shortDate, todayLocal } from '@/lib/date';
import { standingOf, teamLabel } from '@/utils/playerInsights';
import type { Match } from '@/types';

interface ClubHomeProps {
  data: ClubData;
  /** 「나」에서 고른 내 선수 (없으면 null) */
  myPlayerId: string | null;
  isAdmin: boolean;
  isDemo?: boolean;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function SectionHead({ title, href, more }: { title: string; href?: string; more?: string }) {
  return (
    <div className="flex items-end justify-between mb-2.5">
      <h2 className="text-[17px] font-extrabold tracking-tight text-ink">{title}</h2>
      {href && (
        <Link href={href} className="text-xs font-bold text-ink-mute flex items-center">
          {more ?? '전체'} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

/** 점수 띠의 경기 하나 */
function StripCard({ match, no }: { match: Match; no: number }) {
  const aWon = match.scoreA > match.scoreB;
  const bWon = match.scoreB > match.scoreA;
  const line = (label: string, score: number, won: boolean) => (
    <div className={`flex items-center justify-between gap-2 h-6 ${won ? 'text-ink font-extrabold' : 'text-ink-soft font-semibold'}`}>
      <span className="text-[13px] truncate">{label}</span>
      <span className={`num text-[17px] font-extrabold ${won ? 'text-accent' : ''}`}>{score}</span>
    </div>
  );
  return (
    <div className="w-[188px] shrink-0 snap-start rounded-[14px] bg-card px-3 py-2.5">
      <div className="flex items-center justify-between text-[10px] font-extrabold tracking-[0.06em] text-ink-mute">
        <span>{no}경기</span>
        {match.videoUrl && <Play className="w-3 h-3 fill-live text-live" aria-label="영상 있음" />}
      </div>
      <div className="mt-1">
        {line(teamLabel(match.teamA), match.scoreA, aWon)}
        {line(teamLabel(match.teamB), match.scoreB, bWon)}
      </div>
    </div>
  );
}

// 클럽 홈: 누가 들어와도 같은 "클럽 소식" 화면. 내 순위는 「나」 탭이 맡는다.
export default function ClubHome({ data, myPlayerId, isAdmin, isDemo }: ClubHomeProps) {
  const today = todayLocal();
  const scope = currentScope(data, today);
  const photoOf = photoMap(data);
  const strip = latestStrip(data);
  const [last, ...earlier] = recentMeetings(data, 4);
  const upcoming = upcomingSchedule(data, today, 3);
  const top = scope ? topRanked(scope, 3) : [];
  const leaderList = scope ? leaders(scope) : [];
  const mine = scope && myPlayerId ? standingOf(scope.players, scope.matches, myPlayerId) : null;

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface pb-24">
      {/* 머리: 클럽 로고 */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        <AppLogo size={44} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-extrabold tracking-[0.12em] text-ink-mute">LOVE FORTY TENNIS CLUB</div>
          <div className="text-[19px] font-extrabold tracking-tight text-ink leading-tight">러브포티</div>
        </div>
        {mine?.rank != null && scope && (
          <Link href="/me" className="shrink-0 rounded-full bg-card px-3 h-9 flex items-center gap-1.5 text-xs font-bold text-ink-soft">
            내 순위 <b className="num text-[15px] font-extrabold text-accent">{mine.rank}</b>위
          </Link>
        )}
      </header>
      {isDemo && <p className="px-5 -mt-1 mb-2 text-[11px] font-bold text-down">예시 데이터입니다 — 서버가 연결되지 않은 개발 환경</p>}

      {/* 점수 띠: 가장 마지막 모임의 경기 */}
      {strip && (
        <section aria-label="최근 경기 점수">
          <div className="px-5 mb-1.5 flex items-center justify-between text-[11px] font-extrabold tracking-[0.08em] text-ink-mute">
            <span>최근 경기 · {shortDate(strip.date)}</span>
            <Link href={`/live?date=${strip.date}`} className="flex items-center">
              결과 전체 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x px-5 pb-1">
            {strip.matches.map(({ match, no }) => (
              <StripCard key={match.id} match={match} no={no} />
            ))}
          </div>
        </section>
      )}

      <div className="px-5">
        {/* 대표 카드: 지난 모임 */}
        {last && (
          <Link
            href={`/live?date=${last.date}`}
            className="mt-4 block rounded-[22px] bg-ink text-surface p-5 active:scale-[0.99] transition-transform"
          >
            <div className="text-[11px] font-extrabold tracking-[0.12em] opacity-60">지난 모임</div>
            <div className="mt-1 text-[22px] font-extrabold tracking-tight">{longDate(last.date)}</div>
            <div className="mt-0.5 text-sm font-semibold opacity-75 flex items-center gap-1">
              {last.place && (
                <>
                  <MapPin className="w-3.5 h-3.5" /> {last.place} ·{' '}
                </>
              )}
              <span className="num">
                {last.people}명 · {last.matches.length}경기
              </span>
            </div>
            {last.mvps.length > 0 && (
              <div className="mt-4 flex gap-3">
                {last.mvps.map((mvp) => (
                  <div key={mvp.id} className="flex-1 min-w-0 rounded-[14px] bg-surface/10 p-2.5 flex items-center gap-2.5">
                    <PlayerAvatar photo={photoOf.get(mvp.id)} gender={mvp.gender} name={mvp.name} sizeClass="w-11 h-11" emojiClass="text-base" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold tracking-[0.08em] opacity-60">{mvp.gender === 'FEMALE' ? '여자' : '남자'} MVP</div>
                      <div className="text-[15px] font-extrabold truncate">{mvp.name}</div>
                      <div className="num text-[11px] font-bold opacity-70">
                        {mvp.wins}승 {mvp.played - mvp.wins}패
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {last.videos > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface text-ink px-3 h-8 text-xs font-extrabold">
                <Play className="w-3.5 h-3.5 fill-live text-live" /> 영상 {last.videos}개
              </div>
            )}
          </Link>
        )}

        {/* 다음 모임 */}
        <section className="mt-7">
          <SectionHead title="다음 모임" href={isAdmin ? '/schedule' : undefined} more="일정 관리" />
          {upcoming.length === 0 ? (
            <div className="rounded-[14px] bg-card px-4 py-4 text-sm text-ink-mute flex items-center gap-2">
              <CalendarDays className="w-4 h-4 shrink-0" /> 아직 잡힌 모임이 없습니다.
            </div>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((s) => {
                const d = new Date(`${s.date}T00:00:00`);
                const isToday = s.date === today;
                return (
                  <li key={s.id} className="rounded-[14px] bg-card px-3.5 py-3 flex items-center gap-3.5">
                    <div className={`w-14 shrink-0 rounded-xl py-1.5 text-center ${isToday ? 'bg-accent text-accent-ink' : 'bg-card-soft text-ink'}`}>
                      <div className="text-[10px] font-extrabold opacity-70">
                        {d.getMonth() + 1}월 {WEEKDAYS[d.getDay()]}
                      </div>
                      <div className="num text-[22px] font-black leading-none mt-0.5">{d.getDate()}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-extrabold text-ink truncate">
                        {isToday && <span className="text-accent">오늘 · </span>}
                        {s.time ? <span className="num">{s.time}</span> : '시간 미정'}
                      </div>
                      <div className="text-[13px] font-semibold text-ink-soft truncate flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {s.place}
                      </div>
                      {s.memo && <div className="text-xs text-ink-mute truncate">{s.memo}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 기간 랭킹 상위 3 */}
        {scope && top.length > 0 && (
          <section className="mt-7">
            <SectionHead title={`${scope.label} 랭킹`} href="/rankings" more="전체 순위" />
            <ol className="rounded-[14px] bg-card divide-y divide-line">
              {top.map(({ rank, stat, change }) => (
                <li key={stat.playerId} className={`flex items-center gap-3 px-3.5 h-[62px] ${stat.playerId === myPlayerId ? 'shadow-[inset_3px_0_0_var(--accent)]' : ''}`}>
                  <span className={`num w-6 text-center text-[22px] font-black ${rank === 1 ? 'text-accent' : 'text-ink'}`}>{rank}</span>
                  <PlayerAvatar photo={photoOf.get(stat.playerId)} gender={stat.gender} name={stat.name} sizeClass="w-10 h-10" emojiClass="text-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-extrabold text-ink truncate">
                      {stat.name}
                      {change !== null && change !== 0 && (
                        <span className={`num ml-1.5 text-[11px] font-extrabold ${change > 0 ? 'text-up' : 'text-down'}`}>
                          {change > 0 ? '▲' : '▼'}
                          {Math.abs(change)}
                        </span>
                      )}
                    </div>
                    <div className="num text-xs font-semibold text-ink-mute">
                      {stat.wins}승 {stat.losses}패 · 승률 {Math.round(stat.winRate)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="num text-[22px] font-black text-ink leading-none">{stat.totalPoints}</div>
                    <div className="text-[10px] font-bold text-ink-mute">점</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* 기록 리더 */}
        {scope && leaderList.length > 0 && (
          <section className="mt-7">
            <SectionHead title="기록 리더" />
            <div className="grid grid-cols-3 gap-2">
              {leaderList.map((l) => (
                <div key={l.key} className="rounded-[14px] bg-card px-2.5 py-3 text-center">
                  <div className="text-[11px] font-extrabold text-ink-mute">{l.label}</div>
                  <div className="mt-2 flex justify-center">
                    <PlayerAvatar
                      photo={photoOf.get(l.playerId)}
                      gender={scope.players.find((p) => p.id === l.playerId)?.gender ?? 'MALE'}
                      name={l.name}
                      sizeClass="w-10 h-10"
                      emojiClass="text-sm"
                    />
                  </div>
                  <div className="mt-1.5 text-[13px] font-extrabold text-ink truncate">{l.name}</div>
                  <div className="num text-[19px] font-black text-accent leading-tight">{l.value}</div>
                  <div className="num text-[10px] font-bold text-ink-mute">{l.sub}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">{scope.label} 기준 · 승률은 3경기 이상 뛴 사람 중에서</p>
          </section>
        )}

        {/* 최근 모임 결과 */}
        {earlier.length > 0 && (
          <section className="mt-7">
            <SectionHead title="이전 모임" href="/live" more="경기 기록" />
            <ul className="rounded-[14px] bg-card divide-y divide-line">
              {earlier.map((m) => (
                <li key={m.date}>
                  <Link href={`/live?date=${m.date}`} className="flex items-center gap-3 px-3.5 h-[58px]">
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-extrabold text-ink">{longDate(m.date)}</div>
                      <div className="text-xs font-semibold text-ink-mute truncate">
                        <span className="num">
                          {m.people}명 · {m.matches.length}경기
                        </span>
                        {m.mvps.length > 0 && ` · MVP ${m.mvps.map((x) => x.name).join('·')}`}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!last && !scope && (
          <p className="mt-8 text-sm text-ink-mute">아직 기록된 경기가 없습니다. 첫 모임을 기록하면 여기에 소식이 쌓입니다.</p>
        )}
      </div>
    </main>
  );
}
