// 시즌 타임라인 서버 API — 시즌·리그 경기·친선경기 접근 계층.
// 서버(/api/league → Upstash)가 유일한 원본이다. 경기 1건 = 항목 1개라서 동시 편집이 서로를 덮어쓰지 않는다.
// 관리자 쓰기 경로는 lib/writeQueue.ts를 통해 오프라인 재시도가 보장된다.
// (2026-11 Supabase에서 이전 — 함수 이름과 반환 형태는 그대로 유지)

import type { FriendlyMatchRow, Match, Player, PlayerStat, SeasonRow, ScheduleItem } from '@/types';
import { MatchSchema } from '@/lib/schemas';
import { apiGet, apiPost, isDemoMode } from '@/lib/backend';

export class SeasonApiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SeasonApiError';
  }
}

async function wrap<T>(run: () => Promise<T>): Promise<T> {
  if (isDemoMode()) throw new SeasonApiError('예시 모드에서는 서버를 쓰지 않습니다.');
  try {
    return await run();
  } catch (e) {
    throw new SeasonApiError(e instanceof Error ? e.message : '서버 요청에 실패했습니다.', e);
  }
}

/** @deprecated Supabase 시절의 테이블 미생성 판별 — 새 서버에는 해당 상황이 없다. 호출부 호환용. */
export function isMissingTableError(e: unknown): boolean {
  void e;
  return false;
}

/** 서버 값을 Match로 검증 — 깨진 항목은 버리되 경고를 남긴다 */
function parseMatches(items: unknown[]): Match[] {
  const matches: Match[] = [];
  for (const item of items) {
    const parsed = MatchSchema.safeParse(item);
    if (parsed.success) matches.push(parsed.data);
    else console.warn('[seasonApi] Invalid match skipped:', parsed.error.issues);
  }
  return matches;
}

// ── 조회 ─────────────────────────────────────────────────────

interface LiveResponse {
  season: SeasonRow | null;
  matches: unknown[];
  rev: number;
}

/** 진행 중 시즌과 그 경기를 한 번에 (요청 1번) */
export async function fetchLive(): Promise<{ season: SeasonRow | null; matches: Match[]; rev: number }> {
  const res = await wrap(() => apiGet<LiveResponse>('live'));
  return { season: res.season, matches: parseMatches(res.matches), rev: res.rev };
}

export async function fetchLiveSeason(): Promise<SeasonRow | null> {
  return (await fetchLive()).season;
}

export async function fetchSeasonById(seasonId: string): Promise<SeasonRow | null> {
  return (await wrap(() => apiGet<{ season: SeasonRow | null }>('season', { id: seasonId }))).season;
}

export async function fetchSeasons(): Promise<SeasonRow[]> {
  return (await wrap(() => apiGet<{ seasons: SeasonRow[] }>('seasons'))).seasons;
}

export async function fetchSeasonMatches(seasonId: string): Promise<Match[]> {
  const res = await wrap(() => apiGet<{ matches: unknown[] }>('season', { id: seasonId }));
  return parseMatches(res.matches);
}

interface AllResponse {
  seasons: { season: SeasonRow; matches: unknown[] }[];
  friendly: FriendlyMatchRow[];
  members?: Player[];
  schedule?: ScheduleItem[];
}

/** 전체 시즌 + 경기 + 친선경기 일괄 조회 (종합·통산 랭킹용, 요청 1번) */
export async function fetchEverything(): Promise<{
  seasons: { season: SeasonRow; matches: Match[] }[];
  friendly: FriendlyMatchRow[];
  members: Player[];
  schedule: ScheduleItem[];
}> {
  const res = await wrap(() => apiGet<AllResponse>('all'));
  return {
    members: res.members ?? [],
    schedule: res.schedule ?? [],
    seasons: res.seasons.map(({ season, matches }) => ({ season, matches: parseMatches(matches) })),
    friendly: res.friendly.filter((f) => MatchSchema.safeParse(f.match).success),
  };
}

/** 전체 시즌 + 경기 일괄 조회 (투어 랭킹/통산 집계용) */
export async function fetchAllSeasonsWithMatches(): Promise<{ season: SeasonRow; matches: Match[] }[]> {
  return (await fetchEverything()).seasons;
}

/** 경기 id 하나로 찾기 (심판 화면). 리그 경기면 seasonId, 친선경기면 null */
export async function fetchMatchById(matchId: string): Promise<{ seasonId: string | null; match: Match } | null> {
  const res = await wrap(() =>
    apiGet<{ found: { seasonId: string | null; match: unknown } | null }>('match', { id: matchId })
  );
  if (!res.found) return null;
  const parsed = MatchSchema.safeParse(res.found.match);
  return parsed.success ? { seasonId: res.found.seasonId, match: parsed.data } : null;
}

// ── 클럽 회원 명단 (시즌과 무관한 현재 회원) ──────────────────

export async function fetchMembers(): Promise<Player[]> {
  return (await wrap(() => apiGet<{ members: Player[] }>('members'))).members;
}

export async function saveMembers(players: Player[]): Promise<void> {
  await wrap(() => apiPost({ op: 'members-set', players }));
}

// ── 다음 모임 일정 (운영진) ─────────────────────────────────

export async function saveScheduleItem(item: ScheduleItem): Promise<void> {
  await wrap(() => apiPost({ op: 'schedule-upsert', item }));
}

export async function deleteScheduleItem(id: string): Promise<void> {
  await wrap(() => apiPost({ op: 'schedule-delete', id }));
}

// ── 시즌 쓰기 (관리자) ───────────────────────────────────────

export async function createSeason(input: {
  seasonNo: number;
  name: string;
  players: Player[];
  startsOn?: string;
}): Promise<SeasonRow> {
  return (await wrap(() => apiPost<{ season: SeasonRow }>({ op: 'season-create', ...input }))).season;
}

export async function updateSeasonPlayers(seasonId: string, players: Player[]): Promise<void> {
  await wrap(() => apiPost({ op: 'season-players', seasonId, players }));
}

export async function renameSeason(seasonId: string, name: string): Promise<void> {
  await wrap(() => apiPost({ op: 'season-rename', seasonId, name }));
}

export async function archiveSeason(
  seasonId: string,
  input: { endsOn: string; finalRankings: PlayerStat[]; championPlayerId?: string }
): Promise<void> {
  await wrap(() => apiPost({ op: 'season-archive', seasonId, ...input }));
}

/** 시즌과 소속 경기 전체 삭제 (실수로 만든 시즌 정리용) */
export async function deleteSeason(seasonId: string): Promise<void> {
  await wrap(() => apiPost({ op: 'season-delete', seasonId }));
}

// ── 경기 쓰기 (관리자) ───────────────────────────────────────

export async function upsertLeagueMatch(seasonId: string, match: Match): Promise<void> {
  await wrap(() => apiPost({ op: 'match-upsert', seasonId, match }));
}

export async function deleteLeagueMatch(matchId: string): Promise<void> {
  await wrap(() => apiPost({ op: 'match-delete', matchId }));
}

// ── 친선경기 (리그 밖 경기, 투어 랭킹 반영) ──────────────────

export async function fetchFriendlyRows(): Promise<FriendlyMatchRow[]> {
  return (await wrap(() => apiGet<{ friendly: FriendlyMatchRow[] }>('friendly'))).friendly;
}

/** 특정 날짜 이후의 친선경기 조회 (리그 화면 병합용) */
export async function fetchFriendlyMatchesSince(dateFrom: string): Promise<Match[]> {
  const res = await wrap(() => apiGet<{ friendly: FriendlyMatchRow[] }>('friendly', { since: dateFrom }));
  return parseMatches(res.friendly.map((f) => f.match));
}

/** 친선경기 저장 — isFriendly 표시는 서버가 벗겨서 저장한다 */
export async function upsertFriendlyMatch(match: Match): Promise<void> {
  await wrap(() => apiPost({ op: 'friendly-upsert', match }));
}

export async function deleteFriendlyMatch(matchId: string): Promise<void> {
  await wrap(() => apiPost({ op: 'friendly-delete', matchId }));
}

// ── 실시간에 가까운 갱신 ─────────────────────────────────────

export interface LiveSeasonSubscriptionHandlers {
  onMatchUpsert?: (match: Match) => void;
  onMatchDelete?: (matchId: string) => void;
  onSeasonChange?: (season: SeasonRow) => void;
  onStatus?: (status: 'connected' | 'disconnected') => void;
}

const POLL_MS = 10_000;

/**
 * live 시즌의 경기/메타 변경을 구독한다. 반환값을 호출하면 구독 해제.
 * 서버의 변경 번호(rev)를 10초마다 확인하고, 바뀌었을 때만 시즌을 다시 읽어 달라진 것만 알려준다.
 * 화면이 가려져 있는 동안은 확인하지 않는다.
 */
export function subscribeLiveSeason(seasonId: string, handlers: LiveSeasonSubscriptionHandlers): () => void {
  if (isDemoMode() || typeof window === 'undefined') return () => {};

  let stopped = false;
  let lastRev: number | null = null;
  let known: Map<string, string> | null = null; // 경기 id → JSON (달라진 것만 골라내기 위한 기억)
  let lastSeason = '';

  const sync = async () => {
    const res = await apiGet<{ season: SeasonRow | null; matches: unknown[] }>('season', { id: seasonId });
    const matches = parseMatches(res.matches);
    const next = new Map(matches.map((m) => [m.id, JSON.stringify(m)]));
    if (known) {
      for (const m of matches) if (known.get(m.id) !== next.get(m.id)) handlers.onMatchUpsert?.(m);
      for (const id of known.keys()) if (!next.has(id)) handlers.onMatchDelete?.(id);
    }
    known = next;
    if (res.season) {
      const snapshot = JSON.stringify(res.season);
      if (lastSeason && snapshot !== lastSeason) handlers.onSeasonChange?.(res.season);
      lastSeason = snapshot;
    }
  };

  const tick = async () => {
    if (stopped || document.hidden) return;
    try {
      const { rev } = await apiGet<{ rev: number }>('rev');
      if (stopped) return;
      if (rev !== lastRev) {
        await sync();
        lastRev = rev;
      }
      handlers.onStatus?.('connected');
    } catch {
      if (!stopped) handlers.onStatus?.('disconnected');
    }
  };

  void tick();
  const timer = setInterval(() => void tick(), POLL_MS);
  const onVisible = () => {
    if (!document.hidden) void tick();
  };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
