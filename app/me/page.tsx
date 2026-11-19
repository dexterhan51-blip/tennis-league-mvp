'use client';

import Link from 'next/link';
import { ChevronRight, Settings } from 'lucide-react';
import ScoreRow from '@/components/match/ScoreRow';
import { PlayerAvatar } from '@/components/live/PlayerAvatar';
import { FullError, FullLoading } from '@/components/ui/DataState';
import { useAuth } from '@/contexts/AuthContext';
import { useClubData } from '@/hooks/useClubData';
import { currentScope, photoMap } from '@/lib/clubView';
import { EVENT_LABEL, emptyTally, type EventTally } from '@/lib/fcpxmlImport';
import { DEMO_MY_PLAYER_ID } from '@/lib/demoData';
import {
  matchesOf,
  opponentRecords,
  partnerRecords,
  rankTimeline,
  sideOf,
  standingOf,
  type PairRecord,
  type RankPoint,
} from '@/utils/playerInsights';
import type { RallyEventKind } from '@/types';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-extrabold tracking-[0.08em] text-ink-mute uppercase">{children}</span>;
}

/** 경기일별 순위 꺾은선 (위가 1위) */
function RankChart({ timeline, size }: { timeline: RankPoint[]; size: number }) {
  if (timeline.length < 2) {
    return <p className="text-sm text-ink-mute">경기일이 2번 이상 쌓이면 순위 흐름이 그려집니다.</p>;
  }
  const W = 300;
  const H = 86;
  const maxRank = Math.max(size, ...timeline.map((t) => t.rank), 2);
  const x = (i: number) => 6 + (i * (W - 12)) / (timeline.length - 1);
  const y = (rank: number) => 10 + ((rank - 1) * (H - 20)) / (maxRank - 1);
  const last = timeline[timeline.length - 1];
  // 라벨은 최대 7개만 (경기일이 많으면 고르게 건너뛴다)
  const step = Math.ceil(timeline.length / 7);
  const labels = timeline.filter((_, i) => (timeline.length - 1 - i) % step === 0);

  return (
    <div className="bg-card rounded-[14px] px-3.5 pt-3.5 pb-2">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full h-[86px]" role="img" aria-label={`순위 흐름: ${timeline.map((t) => `${t.rank}위`).join(', ')}`}>
        {[10, H / 2, H - 10].map((gy) => (
          <line key={gy} x1="0" y1={gy} x2={W} y2={gy} stroke="var(--line)" strokeWidth="1" />
        ))}
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          points={timeline.map((t, i) => `${x(i)},${y(t.rank)}`).join(' ')}
        />
        <circle cx={x(timeline.length - 1)} cy={y(last.rank)} r="4" fill="var(--accent)" />
      </svg>
      <div className="num flex justify-between mt-1 text-[10px] font-bold text-ink-mute">
        {labels.map((t) => (
          <span key={t.date}>{t.rank}위</span>
        ))}
      </div>
    </div>
  );
}

function PairBars({ records }: { records: PairRecord[] }) {
  return (
    <div>
      {records.map((r) => (
        <div key={r.playerId} className="grid grid-cols-[64px_1fr_84px] items-center gap-2.5 h-[34px] text-[13px] font-bold text-ink">
          <span className="truncate">{r.name}</span>
          <span className="h-2 rounded bg-card-soft overflow-hidden">
            <span className="block h-full rounded bg-accent" style={{ width: `${r.winRate}%` }} />
          </span>
          <span className="num text-right text-xs text-ink-soft">
            <b className="text-sm text-ink">{Math.round(r.winRate)}%</b> {r.wins}승 {r.losses}패
          </span>
        </div>
      ))}
    </div>
  );
}

// 나: 내 시즌 기록(순위 흐름·파트너·상대 전적·지난 시즌) + 설정 진입
export default function MePage() {
  const { profile, setMyPlayer } = useAuth();
  const { data, status, isDemo } = useClubData();

  if (status === 'loading') return <FullLoading />;
  if (status === 'error' || !data) return <FullError message="기록을 불러올 수 없습니다. 네트워크를 확인해주세요." />;

  const scope = currentScope(data);
  const matches = scope?.matches ?? [];
  const pastSeasons = data.seasons.map((x) => x.season).filter((x) => x.status === 'archived');
  const photoOf = photoMap(data);

  const myPlayerId = isDemo ? DEMO_MY_PLAYER_ID : profile.player_id;
  const players = scope?.players ?? [];
  const me = players.find((p) => p.id === myPlayerId) ?? null;
  const name = me?.name ?? (isDemo ? '한씨' : profile.name);
  const { table, rank, stat } = standingOf(players, matches, myPlayerId);
  const timeline = myPlayerId ? rankTimeline(players, matches, myPlayerId) : [];
  const myMatches = myPlayerId ? matchesOf(matches, myPlayerId) : [];
  // 표본이 너무 적은 조합(1경기)은 뒤로 밀리도록 2경기 이상을 먼저 보여준다
  const pick = (records: PairRecord[]) => {
    const solid = records.filter((r) => r.played >= 2);
    return (solid.length > 0 ? solid : records).slice(0, 4);
  };
  const partners = myPlayerId ? pick(partnerRecords(myMatches, myPlayerId)) : [];
  const opponents = myPlayerId ? pick(opponentRecords(myMatches, myPlayerId)) : [];
  // 편집 파일에서 가져온 상세 기록: 내가 속한 팀 / 상대 팀으로 합친다
  const detailed = myMatches.filter((m) => m.detail && m.detail.events.length > 0);
  const mine: EventTally = emptyTally();
  const theirs: EventTally = emptyTally();
  for (const m of detailed) {
    const side = myPlayerId ? sideOf(m, myPlayerId) : null;
    for (const e of m.detail?.events ?? []) (e.team === side ? mine : theirs)[e.kind]++;
  }

  const history = pastSeasons
    .map((s) => {
      const idx = (s.final_rankings ?? []).findIndex((r) => r.playerId === myPlayerId);
      return idx >= 0 ? { season: s, rank: idx + 1, champion: s.champion_player_id === myPlayerId } : null;
    })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => a.season.season_no - b.season.season_no);

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-6 pb-24">
      <div className="flex items-center gap-3.5">
        <PlayerAvatar photo={(me && photoOf.get(me.id)) ?? me?.photo} gender={me?.gender ?? 'MALE'} name={name || '나'} sizeClass="w-16 h-16" emojiClass="text-2xl" />
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink truncate">{name || '내 기록'}</h1>
          <p className="num mt-0.5 text-xs font-bold text-ink-mute">
            {scope ? scope.label : '기록 없음'}
            {rank !== null && ` · ${rank}위 / ${table.length}명`}
            {stat && ` · ${stat.totalPoints}점`}
          </p>
        </div>
      </div>
      {isDemo && <p className="mt-2 text-[11px] font-bold text-down">예시 데이터입니다 — 서버가 연결되지 않은 개발 환경</p>}

      {!myPlayerId ? (
        <section className="mt-6">
          <Eyebrow>내 이름 고르기</Eyebrow>
          <p className="mt-1.5 text-sm text-ink-mute">고른 이름은 이 기기에만 저장되고, 내 순위와 기록을 보여주는 데만 씁니다.</p>
          {players.length === 0 ? (
            <p className="mt-4 text-sm text-ink-mute">아직 등록된 회원이 없습니다.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setMyPlayer({ id: p.id, name: p.name })}
                  className="h-12 px-3 rounded-[14px] bg-card text-sm font-bold text-ink flex items-center gap-2"
                >
                  <PlayerAvatar photo={p.photo} gender={p.gender} name={p.name} sizeClass="w-7 h-7" emojiClass="text-xs" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : myMatches.length === 0 ? (
        <p className="mt-6 text-sm text-ink-mute">{scope?.kind === 'season' ? '이번 시즌에' : '올해'} 아직 뛴 경기가 없어요.</p>
      ) : (
        <>
          <section className="mt-[22px]">
            <div className="mb-2.5"><Eyebrow>{scope?.kind === 'season' ? '이번 시즌 순위 흐름' : '올해 순위 흐름'}</Eyebrow></div>
            <RankChart timeline={timeline} size={table.length} />
          </section>

          {partners.length > 0 && (
            <section className="mt-[22px]">
              <div className="mb-1.5"><Eyebrow>파트너별 승률</Eyebrow></div>
              <PairBars records={partners} />
            </section>
          )}

          {opponents.length > 0 && (
            <section className="mt-[22px]">
              <div className="mb-1.5"><Eyebrow>상대 전적</Eyebrow></div>
              <PairBars records={opponents} />
            </section>
          )}

          {history.length > 0 && (
            <section className="mt-[22px]">
              <div className="mb-2.5"><Eyebrow>지난 시즌</Eyebrow></div>
              <div className="grid grid-cols-4 gap-1.5">
                {history.map((h) => (
                  <Link
                    key={h.season.id}
                    href={`/live?id=${h.season.id}`}
                    className="bg-card rounded-xl py-2.5 text-center text-[10px] font-bold text-ink-mute"
                  >
                    시즌 {h.season.season_no}
                    <b className={`num block mt-0.5 text-xl font-black ${h.champion ? 'text-accent' : 'text-ink'}`}>{h.rank}위</b>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {detailed.length > 0 && (
            <section className="mt-[22px]">
              <div className="mb-1.5"><Eyebrow>상세 기록 · 영상 편집본 {detailed.length}경기</Eyebrow></div>
              <div className="grid grid-cols-[1fr_56px_56px] items-center text-[10px] font-extrabold tracking-[0.06em] text-ink-mute h-7">
                <span />
                <span className="text-right">우리 팀</span>
                <span className="text-right">상대 팀</span>
              </div>
              {(Object.keys(EVENT_LABEL) as RallyEventKind[]).map((kind) => (
                <div key={kind} className="grid grid-cols-[1fr_56px_56px] items-center h-9 border-t border-line text-sm">
                  <span className="font-bold text-ink">{EVENT_LABEL[kind]}</span>
                  <span className="num text-right font-extrabold text-ink">{mine[kind]}</span>
                  <span className="num text-right font-semibold text-ink-mute">{theirs[kind]}</span>
                </div>
              ))}
              <p className="mt-2 text-[11px] text-ink-faint">편집본의 기록은 팀 단위라, 파트너의 플레이도 우리 팀에 함께 들어갑니다.</p>
            </section>
          )}

          <section className="mt-[22px]">
            <div className="mb-2.5"><Eyebrow>내 경기 {myMatches.length}</Eyebrow></div>
            <div className="space-y-2">
              {myMatches.slice(0, 10).map((m) => (
                <ScoreRow key={m.id} match={m} highlightPlayerId={myPlayerId} />
              ))}
            </div>
            {myMatches.length > 10 && (
              <Link href="/live" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-ink-mute">
                이전 경기는 「경기」 탭에서 날짜별로 볼 수 있어요 <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </section>
        </>
      )}

      {myPlayerId && !isDemo && (
        <button onClick={() => setMyPlayer(null)} className="mt-6 h-9 text-xs font-bold text-ink-mute underline underline-offset-2">
          다른 이름으로 바꾸기
        </button>
      )}

      <nav className="mt-4 border-t border-line" aria-label="더 보기">
        {[
          { href: '/settings', icon: <Settings className="w-[18px] h-[18px]" />, label: '설정 · 운영진 모드' },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 h-[52px] border-b border-line text-sm font-bold text-ink">
            <span className="text-ink-mute">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="w-4 h-4 text-ink-faint" />
          </Link>
        ))}
      </nav>
    </main>
  );
}
