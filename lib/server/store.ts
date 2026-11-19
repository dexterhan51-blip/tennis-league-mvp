// 러브포티 저장소 (서버 전용) — 버셀에 붙인 Upstash Redis.
// 접속 주소·열쇠는 버셀 환경변수에만 있다 (KV_REST_API_URL, KV_REST_API_TOKEN).
// 쭈갑·스핀아 놀자 등과 같은 저장소를 쓰므로 모든 키에 이름표 `lf:` 를 붙인다.
//
//   lf:seasons        HASH  시즌 id → SeasonRow(JSON)
//   lf:m:<시즌 id>     HASH  경기 id → { at, match }(JSON)   at = 처음 등록된 시각(같은 날 경기 순서용)
//   lf:mi             HASH  경기 id → 시즌 id               (경기 id만으로 지울 때 찾는 색인)
//   lf:friendly       HASH  경기 id → { id, match_date, match }(JSON)
//   lf:members        글     클럽 회원 명단 Player[](JSON) — 시즌과 무관한 현재 회원
//   lf:rev            수     무엇이든 바뀔 때마다 +1          (화면이 새로 읽을지 판단하는 값)

import { randomUUID } from 'node:crypto';
import type { FriendlyMatchRow, Match, Player, PlayerStat, SeasonRow } from '@/types';

const K = {
  seasons: 'lf:seasons',
  matches: (seasonId: string) => `lf:m:${seasonId}`,
  matchIndex: 'lf:mi',
  friendly: 'lf:friendly',
  members: 'lf:members',
  rev: 'lf:rev',
  fail: (ip: string) => `lf:fail:${ip}`,
};

export class StoreError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
    this.name = 'StoreError';
  }
}

type Command = (string | number)[];

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export function isStoreConfigured(): boolean {
  return !!url() && !!token();
}

async function redis(cmds: Command[]): Promise<unknown[]> {
  if (!isStoreConfigured()) throw new StoreError('저장소가 설정되지 않았습니다.', 503);
  const res = await fetch(`${url()}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token()}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmds),
    cache: 'no-store',
  });
  if (!res.ok) throw new StoreError('저장소 요청에 실패했습니다.', 502);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  if (!Array.isArray(out) || out.some((x) => x.error)) throw new StoreError('저장소 요청에 실패했습니다.', 502);
  return out.map((x) => x.result);
}

/** HVALS/HGETALL 결과(문자열 배열)를 JSON으로 푼다. 깨진 값은 버린다. */
function parseAll<T>(values: unknown): T[] {
  if (!Array.isArray(values)) return [];
  const out: T[] = [];
  for (const v of values) {
    try {
      out.push(JSON.parse(String(v)) as T);
    } catch {
      console.warn('[store] 깨진 값을 건너뜁니다');
    }
  }
  return out;
}

interface StoredMatch {
  at: number;
  match: Match;
}

function sortMatches(rows: StoredMatch[]): Match[] {
  return rows
    .sort((a, b) => (a.match.date || '').localeCompare(b.match.date || '') || a.at - b.at)
    .map((r) => r.match);
}

function sortFriendly(rows: FriendlyMatchRow[]): FriendlyMatchRow[] {
  return rows.sort((a, b) => (a.match_date || '').localeCompare(b.match_date || '') || (a.at ?? 0) - (b.at ?? 0));
}

// ── 읽기 ─────────────────────────────────────────────────────

export async function getRev(): Promise<number> {
  const [rev] = await redis([['GET', K.rev]]);
  return Number(rev) || 0;
}

export async function listSeasons(): Promise<SeasonRow[]> {
  const [values] = await redis([['HVALS', K.seasons]]);
  return parseAll<SeasonRow>(values).sort((a, b) => b.season_no - a.season_no);
}

export async function getSeason(seasonId: string): Promise<SeasonRow | null> {
  const [value] = await redis([['HGET', K.seasons, seasonId]]);
  return value ? (JSON.parse(String(value)) as SeasonRow) : null;
}

export async function getSeasonMatches(seasonId: string): Promise<Match[]> {
  const [values] = await redis([['HVALS', K.matches(seasonId)]]);
  return sortMatches(parseAll<StoredMatch>(values));
}

export async function getLive(): Promise<{ season: SeasonRow | null; matches: Match[]; rev: number }> {
  const [seasons, rev] = await Promise.all([listSeasons(), getRev()]);
  const season = seasons.find((s) => s.status === 'live') ?? null;
  return { season, matches: season ? await getSeasonMatches(season.id) : [], rev };
}

export async function listFriendly(since?: string): Promise<FriendlyMatchRow[]> {
  const [values] = await redis([['HVALS', K.friendly]]);
  return sortFriendly(parseAll<FriendlyMatchRow>(values).filter((r) => !since || (r.match_date || '') >= since));
}

export async function getMembers(): Promise<Player[]> {
  const [value] = await redis([['GET', K.members]]);
  try {
    return value ? (JSON.parse(String(value)) as Player[]) : [];
  } catch {
    return [];
  }
}

export async function setMembers(players: Player[]): Promise<void> {
  await redis([['SET', K.members, JSON.stringify(players)], ['INCR', K.rev]]);
}

/** 전체 시즌 + 경기 + 친선경기 + 회원 명단 (종합·통산 랭킹용) */
export async function getAll(): Promise<{
  seasons: { season: SeasonRow; matches: Match[] }[];
  friendly: FriendlyMatchRow[];
  members: Player[];
  rev: number;
}> {
  const seasons = (await listSeasons()).sort((a, b) => a.season_no - b.season_no);
  const results = await redis([
    ...seasons.map((s): Command => ['HVALS', K.matches(s.id)]),
    ['HVALS', K.friendly],
    ['GET', K.rev],
    ['GET', K.members],
  ]);
  let members: Player[] = [];
  try {
    const raw = results[seasons.length + 2];
    members = raw ? (JSON.parse(String(raw)) as Player[]) : [];
  } catch {
    members = [];
  }
  return {
    members,
    seasons: seasons.map((season, i) => ({ season, matches: sortMatches(parseAll<StoredMatch>(results[i])) })),
    friendly: sortFriendly(parseAll<FriendlyMatchRow>(results[seasons.length])),
    rev: Number(results[seasons.length + 1]) || 0,
  };
}

/** 경기 id 하나로 찾기 — 리그 경기 먼저, 없으면 친선경기 */
export async function findMatch(matchId: string): Promise<{ seasonId: string | null; match: Match } | null> {
  const [seasonId, friendly] = await redis([
    ['HGET', K.matchIndex, matchId],
    ['HGET', K.friendly, matchId],
  ]);
  if (seasonId) {
    const [value] = await redis([['HGET', K.matches(String(seasonId)), matchId]]);
    if (value) return { seasonId: String(seasonId), match: (JSON.parse(String(value)) as StoredMatch).match };
  }
  if (friendly) {
    const row = JSON.parse(String(friendly)) as FriendlyMatchRow;
    return { seasonId: null, match: { ...row.match, isFriendly: true } };
  }
  return null;
}

// ── 쓰기 (운영진) ────────────────────────────────────────────

const now = () => new Date().toISOString();

async function saveSeason(season: SeasonRow, extra: Command[] = []): Promise<void> {
  await redis([['HSET', K.seasons, season.id, JSON.stringify(season)], ...extra, ['INCR', K.rev]]);
}

async function requireSeason(seasonId: string): Promise<SeasonRow> {
  const season = await getSeason(seasonId);
  if (!season) throw new StoreError('시즌을 찾을 수 없습니다.', 404);
  return season;
}

export async function createSeason(input: {
  seasonNo: number;
  name: string;
  players: Player[];
  startsOn?: string;
}): Promise<SeasonRow> {
  const seasons = await listSeasons();
  // 진행 중 시즌은 항상 하나뿐
  if (seasons.some((s) => s.status === 'live')) {
    throw new StoreError('이미 진행 중인 시즌이 있습니다. 먼저 종료해주세요.', 409);
  }
  const season: SeasonRow = {
    id: randomUUID(),
    season_no: input.seasonNo,
    name: input.name,
    status: 'live',
    players: input.players,
    starts_on: input.startsOn ?? now().split('T')[0],
    ends_on: null,
    final_rankings: null,
    champion_player_id: null,
    created_at: now(),
    updated_at: now(),
  };
  await saveSeason(season);
  return season;
}

export async function updateSeasonPlayers(seasonId: string, players: Player[]): Promise<void> {
  const season = await requireSeason(seasonId);
  await saveSeason({ ...season, players, updated_at: now() });
}

export async function renameSeason(seasonId: string, name: string): Promise<void> {
  const season = await requireSeason(seasonId);
  await saveSeason({ ...season, name, updated_at: now() });
}

export async function archiveSeason(
  seasonId: string,
  input: { endsOn: string; finalRankings: PlayerStat[]; championPlayerId?: string }
): Promise<void> {
  const season = await requireSeason(seasonId);
  await saveSeason({
    ...season,
    status: 'archived',
    ends_on: input.endsOn,
    final_rankings: input.finalRankings,
    champion_player_id: input.championPlayerId ?? null,
    updated_at: now(),
  });
}

/** 시즌과 소속 경기 전체 삭제 (실수로 만든 시즌 정리용) */
export async function deleteSeason(seasonId: string): Promise<void> {
  const [ids] = await redis([['HKEYS', K.matches(seasonId)]]);
  const matchIds = Array.isArray(ids) ? ids.map(String) : [];
  await redis([
    ['HDEL', K.seasons, seasonId],
    ['DEL', K.matches(seasonId)],
    ...(matchIds.length > 0 ? [['HDEL', K.matchIndex, ...matchIds] as Command] : []),
    ['INCR', K.rev],
  ]);
}

export async function upsertLeagueMatch(seasonId: string, match: Match): Promise<void> {
  const [existing, seasonExists] = await redis([
    ['HGET', K.matches(seasonId), match.id],
    ['HEXISTS', K.seasons, seasonId],
  ]);
  if (!seasonExists) throw new StoreError('시즌을 찾을 수 없습니다.', 404);
  // 수정이면 처음 등록 시각을 유지해 같은 날 경기 순서가 바뀌지 않게 한다
  const at = existing ? (JSON.parse(String(existing)) as StoredMatch).at : Date.now();
  await redis([
    ['HSET', K.matches(seasonId), match.id, JSON.stringify({ at, match } satisfies StoredMatch)],
    ['HSET', K.matchIndex, match.id, seasonId],
    ['INCR', K.rev],
  ]);
}

export async function deleteLeagueMatch(matchId: string): Promise<void> {
  const [seasonId] = await redis([['HGET', K.matchIndex, matchId]]);
  if (!seasonId) return; // 이미 없는 경기 — 대기열 재시도가 멈추지 않도록 성공으로 본다
  await redis([
    ['HDEL', K.matches(String(seasonId)), matchId],
    ['HDEL', K.matchIndex, matchId],
    ['INCR', K.rev],
  ]);
}

export async function upsertFriendlyMatch(match: Match): Promise<void> {
  // isFriendly 는 앱 안에서만 쓰는 표시라 벗겨서 저장한다 (종합 랭킹이 리그와 같은 규칙으로 다시 계산하므로)
  const clean = { ...match };
  delete clean.isFriendly;
  // 수정이면 처음 등록 시각을 유지해 같은 날 경기 순서(대진표 순서)가 바뀌지 않게 한다
  const [existing] = await redis([['HGET', K.friendly, match.id]]);
  const at = existing ? (JSON.parse(String(existing)) as FriendlyMatchRow).at ?? Date.now() : Date.now();
  const row: FriendlyMatchRow = { id: match.id, match_date: match.date, match: clean, at };
  await redis([['HSET', K.friendly, match.id, JSON.stringify(row)], ['INCR', K.rev]]);
}

export async function deleteFriendlyMatch(matchId: string): Promise<void> {
  await redis([['HDEL', K.friendly, matchId], ['INCR', K.rev]]);
}

// ── 운영진 코드 시도 횟수 제한 ───────────────────────────────

const FAIL_LIMIT = 10;
const FAIL_WINDOW_SEC = 600;

/** 같은 접속 주소에서 10분에 10번 넘게 틀리면 잠시 막는다 */
export async function isLockedOut(ip: string): Promise<boolean> {
  const [count] = await redis([['GET', K.fail(ip)]]);
  return Number(count) >= FAIL_LIMIT;
}

export async function recordFailure(ip: string): Promise<void> {
  await redis([
    ['INCR', K.fail(ip)],
    ['EXPIRE', K.fail(ip), FAIL_WINDOW_SEC],
  ]);
}

// ── 이전 도구 전용 ───────────────────────────────────────────

/** Supabase 백업을 그대로 옮겨 넣는다 (tools/migrate-to-upstash.mjs 와 같은 저장 형식) */
export const KEYS = K;
