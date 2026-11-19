'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { isDemoMode } from '@/lib/backend';
import { DEMO_MATCHES, DEMO_MY_PLAYER_ID, DEMO_SEASON } from '@/lib/demoData';
import { FullError, FullLoading } from '@/components/ui/DataState';
import { PlayerAvatar } from '@/components/live/PlayerAvatar';
import { calculateRanking } from '@/utils/tennisLogic';
import { recentForm, type MatchOutcome } from '@/utils/playerInsights';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTourRanking, collectYears, collectAllPlayers, TourLeagueSource } from '@/utils/tourRanking';
import { fetchEverything } from '@/lib/seasonApi';
import TourPlayerModal from '@/components/rankings/TourPlayerModal';
import AdminGuestConverter from '@/components/rankings/AdminGuestConverter';
import type { FriendlyMatchRow, Gender, Match, SeasonRow, TourRankingEntry } from '@/types';

type YearFilter = number | 'all';
/** 'season' = 진행 중 시즌, 숫자 = 그 해 종합(시즌+친선), 'all' = 통산 */
type Scope = 'season' | YearFilter;
type GenderFilter = 'ALL' | Gender;

/** 표 한 줄 — 시즌 순위와 종합 순위를 같은 모양으로 그리기 위한 공통 형태 */
interface TableRow {
  playerId: string;
  name: string;
  gender: Gender;
  /** 아직 한 경기도 안 뛴 명단 선수는 null (순위 없이 맨 아래) */
  rank: number | null;
  points: number;
  wins: number;
  losses: number;
  /** 직전 경기일 대비 순위 변화 (+면 상승). 종합 순위에서는 계산하지 않는다 */
  change: number | null;
  form: MatchOutcome[];
  tour?: TourRankingEntry;
}

function FormDots({ form }: { form: MatchOutcome[] }) {
  const label = form.map((f) => (f === 'W' ? '승' : f === 'L' ? '패' : '무')).join(' ');
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={label ? `최근 ${form.length}경기: ${label}` : '최근 경기 없음'}>
      {Array.from({ length: 5 }, (_, i) => {
        const f = form[i];
        return (
          <i
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${f === 'W' ? 'bg-up' : f === 'L' ? 'bg-down' : f === 'D' ? 'bg-ink-faint' : 'bg-line'}`}
          />
        );
      })}
    </span>
  );
}

export default function RankingsPage() {
  const { isAdmin, profile } = useAuth();
  const isDemo = isDemoMode();
  const myPlayerId = isDemo ? DEMO_MY_PLAYER_ID : profile?.player_id ?? null;
  const [scope, setScope] = useState<Scope | null>(null);
  const [gender, setGender] = useState<GenderFilter>('ALL');
  const [mode, setMode] = useState<'view' | 'manage'>('view');
  const [leagues, setLeagues] = useState<TourLeagueSource[] | null>(null);
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [friendly, setFriendly] = useState<FriendlyMatchRow[]>([]);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<{ entry: TourRankingEntry; rank: number } | null>(null);

  const loadData = useCallback(async () => {
    // 서버 미설정(로컬 개발): 예시 데이터로 화면만 확인
    if (isDemoMode()) {
      setSeasons([DEMO_SEASON]);
      setLeagues([{ id: DEMO_SEASON.id, name: DEMO_SEASON.name, players: DEMO_SEASON.players, matches: DEMO_MATCHES }]);
      return;
    }
    try {
      // 시즌(진행 중 + 아카이브) 전체가 통산 랭킹의 소스 — 시즌을 지워도 기록은 남는다
      const { seasons: seasonData, friendly: friendlyRows, members } = await fetchEverything();
      setSeasons(seasonData.map((s) => s.season));
      setLeagues(
        seasonData.map(({ season, matches }) => {
          // 시즌 명단에 없던 회원이 그 시즌 경기에 나온 경우(게스트였다가 회원이 된 사람)도 종합 점수에 넣는다
          const roster = season.players ?? [];
          const rosterIds = new Set(roster.map((p) => p.id));
          return {
            id: season.id,
            name: season.name,
            players: [...roster, ...members.filter((m) => !rosterIds.has(m.id))],
            matches,
          };
        })
      );
      setFriendly(friendlyRows);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const years = useMemo(() => (leagues ? collectYears(leagues, friendly) : []), [leagues, friendly]);

  const liveSeason = useMemo(() => seasons.find((s) => s.status === 'live') ?? null, [seasons]);

  // 기본 탭: 진행 중 시즌이 있으면 시즌, 없으면 최신 연도, 그것도 없으면 통산
  const activeScope: Scope = scope ?? (liveSeason ? 'season' : years[0] ?? 'all');
  const activeYear: YearFilter = activeScope === 'season' ? 'all' : activeScope;

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

  const photoOf = useMemo(() => new Map(pool.map((p) => [p.id, p.photo])), [pool]);

  const rows: TableRow[] = useMemo(() => {
    if (!leagues) return [];

    if (activeScope === 'season' && liveSeason) {
      const league = leagues.find((l) => l.id === liveSeason.id);
      const players = league?.players ?? [];
      const matches = league?.matches ?? [];
      const all = calculateRanking(liveSeason.players ?? players, matches);
      const played = all.filter((s) => s.matchesPlayed > 0);
      // 직전 경기일까지의 순위 — 마지막 경기일 하루 동안 얼마나 오르내렸는지
      const dates = [...new Set(matches.filter((m) => m.isFinished).map((m) => m.date))].sort();
      const lastDate = dates[dates.length - 1];
      const before = lastDate
        ? calculateRanking(players, matches.filter((m) => m.date < lastDate)).filter((s) => s.matchesPlayed > 0)
        : [];
      const prevRank = new Map(before.map((s, i) => [s.playerId, i + 1]));
      const toRow = (s: (typeof all)[number], rank: number | null): TableRow => ({
        playerId: s.playerId,
        name: s.name,
        gender: s.gender,
        rank,
        points: s.totalPoints,
        wins: s.wins,
        losses: s.losses,
        change: rank !== null && prevRank.has(s.playerId) ? (prevRank.get(s.playerId) as number) - rank : null,
        form: recentForm(matches, s.playerId),
      });
      return [
        ...played.map((s, i) => toRow(s, i + 1)),
        ...all.filter((s) => s.matchesPlayed === 0).map((s) => toRow(s, null)),
      ];
    }

    const prefix = activeYear === 'all' ? '' : `${activeYear}-`;
    const scoped: Match[] = [
      ...leagues.flatMap((l) => l.matches),
      ...friendly.map((f) => f.match).filter(Boolean),
    ]
      .filter((m) => (m.date || '').startsWith(prefix))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return entries.map((e, i) => ({
      playerId: e.playerId,
      name: e.name,
      gender: e.gender,
      rank: i + 1,
      points: e.totalPoints,
      wins: e.wins,
      losses: e.losses,
      change: null,
      // 종합 순위의 흐름에는 친선경기도 포함한다 (점수에 들어가므로)
      form: recentForm(scoped.map((m) => ({ ...m, isFriendly: false })), e.playerId),
      tour: e,
    }));
  }, [leagues, liveSeason, activeScope, activeYear, entries, friendly]);

  const visibleRows = gender === 'ALL' ? rows : rows.filter((r) => r.gender === gender);
  const archived = seasons.filter((s) => s.status === 'archived').sort((a, b) => b.season_no - a.season_no);

  if (error) return <FullError message="랭킹 정보를 불러올 수 없습니다. 네트워크를 확인해주세요." />;
  if (!leagues) return <FullLoading />;

  const scopeTabs: { key: Scope; label: string }[] = [
    ...(liveSeason ? [{ key: 'season' as Scope, label: `시즌 ${liveSeason.season_no}` }] : []),
    ...years.map((y) => ({ key: y as Scope, label: `${y} 종합` })),
    { key: 'all', label: '통산' },
  ];

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">랭킹</h1>
        {isAdmin && (
          <div className="flex rounded-lg bg-card-soft p-0.5 text-xs font-bold">
            {(['view', 'manage'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 h-8 rounded-md transition-colors ${mode === m ? 'bg-card text-ink' : 'text-ink-mute'}`}
              >
                {m === 'view' ? '보기' : '관리'}
              </button>
            ))}
          </div>
        )}
      </div>
      {isDemo && <p className="mt-2 text-[11px] font-bold text-down">예시 데이터입니다 — 서버가 연결되지 않은 개발 환경</p>}

      {isAdmin && mode === 'manage' ? (
        <div className="mt-4 space-y-4">
          <AdminGuestConverter leagues={leagues} pool={pool} onConverted={loadData} />
        </div>
      ) : (
        <>
          {/* 범위 탭: 시즌 / 연도 종합 / 통산 */}
          <div className="mt-3.5 -mx-5 px-5 overflow-x-auto scrollbar-hide border-b border-line">
            <div className="flex gap-[18px] w-max" role="tablist" aria-label="랭킹 범위">
              {scopeTabs.map((t) => (
                <button
                  key={String(t.key)}
                  role="tab"
                  aria-selected={activeScope === t.key}
                  onClick={() => setScope(t.key)}
                  className={`pb-2.5 -mb-px text-[15px] font-extrabold border-b-2 whitespace-nowrap transition-colors ${
                    activeScope === t.key ? 'text-ink border-accent' : 'text-ink-mute border-transparent'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1.5 mt-3 mb-1">
            {([['ALL', '전체'], ['MALE', '남자'], ['FEMALE', '여자']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setGender(key)}
                aria-pressed={gender === key}
                className={`h-8 px-3 rounded-full border text-xs font-bold transition-colors ${
                  gender === key ? 'bg-ink text-surface border-ink' : 'border-line text-ink-soft'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-mute">아직 집계된 경기가 없습니다.</p>
          ) : (
            <div>
              <div className="grid grid-cols-[30px_1fr_46px_48px_40px] items-center gap-1 pt-2.5 pb-1.5 text-[10px] font-extrabold tracking-[0.06em] text-ink-mute">
                <span>#</span>
                <span>선수</span>
                <span className="text-right">최근 5</span>
                <span className="text-right">승-패</span>
                <span className="text-right">점수</span>
              </div>
              {visibleRows.map((r, i) => {
                const me = r.playerId === myPlayerId;
                const tour = r.tour;
                const cells = (
                  <>
                    <span className="num text-[17px] font-black text-ink text-left">
                      {r.rank === null ? '–' : gender === 'ALL' ? r.rank : i + 1}
                    </span>
                    <span className="flex items-center gap-2 min-w-0 text-sm font-bold text-ink">
                      <PlayerAvatar photo={photoOf.get(r.playerId)} gender={r.gender} name={r.name} sizeClass="w-7 h-7" emojiClass="text-xs" />
                      <span className="truncate">{r.name}</span>
                      {r.change !== null && r.change !== 0 && (
                        <span className={`num text-[11px] font-extrabold shrink-0 ${r.change > 0 ? 'text-up' : 'text-down'}`}>
                          {r.change > 0 ? '▲' : '▼'}
                          {Math.abs(r.change)}
                        </span>
                      )}
                    </span>
                    <span className="text-right"><FormDots form={r.form} /></span>
                    <span className="num text-right text-xs font-semibold text-ink-soft">
                      {r.wins}-{r.losses}
                    </span>
                    <span className="num text-right text-[18px] font-extrabold text-ink">{r.points}</span>
                  </>
                );
                const rowClass = `grid grid-cols-[30px_1fr_46px_48px_40px] items-center gap-1 h-[50px] w-full -mx-5 px-5 box-content ${
                  me ? 'bg-card shadow-[inset_3px_0_0_var(--accent)]' : 'border-t border-line'
                }`;
                return tour ? (
                  <button
                    key={r.playerId}
                    onClick={() => setSelected({ entry: tour, rank: r.rank ?? i + 1 })}
                    className={rowClass}
                    aria-label={`${r.name} 상세 보기`}
                  >
                    {cells}
                  </button>
                ) : (
                  <div key={r.playerId} className={rowClass}>
                    {cells}
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-[11px] text-ink-faint leading-relaxed">
            점수 = 참석 1점(하루 1회) + 승리 1점.
            {activeScope === 'season'
              ? ' ▲▼는 직전 경기일 대비 순위 변화입니다.'
              : ' 종합·통산은 각 시즌과 친선경기 점수를 합산합니다.'}
          </p>

          {archived.length > 0 && (
            <section className="mt-7">
              <h2 className="text-[11px] font-extrabold tracking-[0.08em] text-ink-mute">지난 시즌</h2>
              <div className="mt-1">
                {archived.map((s) => {
                  const champion = (s.final_rankings ?? []).find((r) => r.playerId === s.champion_player_id);
                  return (
                    <Link key={s.id} href={`/live?id=${s.id}`} className="flex items-center gap-3 h-[58px] border-b border-line">
                      <span className="num w-7 text-[17px] font-black text-ink">{s.season_no}</span>
                      <span className="flex-1 min-w-0">
                        <b className="block text-sm font-bold text-ink truncate">{s.name}</b>
                        <span className="num block text-xs text-ink-mute truncate">
                          {champion?.name ? `우승 ${champion.name}` : '기록 보기'}
                          {s.starts_on ? ` · ${s.starts_on} ~ ${s.ends_on ?? ''}` : ''}
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {selected && (
        <TourPlayerModal
          entry={selected.entry}
          rank={selected.rank}
          friendly={friendlyForModal}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
