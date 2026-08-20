// 시즌 타임라인 서버 API — seasons / league_matches 테이블 접근 계층.
// 서버가 유일한 원본이다. 경기 1건 = 행 1개라서 동시 편집이 서로를 덮어쓰지 않는다.
// 관리자 쓰기 경로는 lib/writeQueue.ts를 통해 오프라인 재시도가 보장된다.

import type { Match, Player, PlayerStat, SeasonRow } from '@/types';
import { MatchSchema } from '@/lib/schemas';
import { getSupabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const SEASON_COLUMNS =
  'id, season_no, name, status, players, starts_on, ends_on, final_rankings, champion_player_id, created_at, updated_at';

export class SeasonApiError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SeasonApiError';
  }
}

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new SeasonApiError('Supabase가 설정되지 않았습니다.');
  return supabase;
}

/** seasons/league_matches 테이블 미생성(마이그레이션 전) 여부 판별 */
export function isMissingTableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /relation .* does not exist|Could not find the table|schema cache/i.test(msg);
}

// ── 조회 ─────────────────────────────────────────────────────

export async function fetchLiveSeason(): Promise<SeasonRow | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('seasons')
    .select(SEASON_COLUMNS)
    .eq('status', 'live')
    .maybeSingle();
  if (error) throw new SeasonApiError(error.message, error);
  return (data as SeasonRow) ?? null;
}

export async function fetchSeasonById(seasonId: string): Promise<SeasonRow | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('seasons')
    .select(SEASON_COLUMNS)
    .eq('id', seasonId)
    .maybeSingle();
  if (error) throw new SeasonApiError(error.message, error);
  return (data as SeasonRow) ?? null;
}

export async function fetchSeasons(): Promise<SeasonRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('seasons')
    .select(SEASON_COLUMNS)
    .order('season_no', { ascending: false });
  if (error) throw new SeasonApiError(error.message, error);
  return (data as SeasonRow[]) ?? [];
}

/** 서버 행(JSONB)을 Match로 검증 — 깨진 행은 버리되 경고를 남긴다 */
function parseMatches(rows: { match: unknown }[]): Match[] {
  const matches: Match[] = [];
  for (const row of rows) {
    const parsed = MatchSchema.safeParse(row.match);
    if (parsed.success) matches.push(parsed.data);
    else console.warn('[seasonApi] Invalid match row skipped:', parsed.error.issues);
  }
  return matches;
}

export async function fetchSeasonMatches(seasonId: string): Promise<Match[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('league_matches')
    .select('match')
    .eq('season_id', seasonId)
    .order('match_date', { ascending: true });
  if (error) throw new SeasonApiError(error.message, error);
  return parseMatches(data ?? []);
}

/** 전체 시즌 + 경기 일괄 조회 (투어 랭킹/통산 집계용) */
export async function fetchAllSeasonsWithMatches(): Promise<
  { season: SeasonRow; matches: Match[] }[]
> {
  const supabase = requireSupabase();
  const [seasonsRes, matchesRes] = await Promise.all([
    supabase.from('seasons').select(SEASON_COLUMNS).order('season_no', { ascending: true }),
    supabase.from('league_matches').select('season_id, match'),
  ]);
  if (seasonsRes.error) throw new SeasonApiError(seasonsRes.error.message, seasonsRes.error);
  if (matchesRes.error) throw new SeasonApiError(matchesRes.error.message, matchesRes.error);

  const bySeason = new Map<string, { match: unknown }[]>();
  for (const row of matchesRes.data ?? []) {
    const list = bySeason.get(row.season_id) ?? [];
    list.push(row);
    bySeason.set(row.season_id, list);
  }
  return ((seasonsRes.data as SeasonRow[]) ?? []).map((season) => ({
    season,
    matches: parseMatches(bySeason.get(season.id) ?? []),
  }));
}

// ── 시즌 쓰기 (관리자) ───────────────────────────────────────

export async function createSeason(input: {
  seasonNo: number;
  name: string;
  players: Player[];
  startsOn?: string;
}): Promise<SeasonRow> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('seasons')
    .insert({
      season_no: input.seasonNo,
      name: input.name,
      status: 'live',
      players: input.players,
      starts_on: input.startsOn ?? new Date().toISOString().split('T')[0],
    })
    .select(SEASON_COLUMNS)
    .single();
  if (error) throw new SeasonApiError(error.message, error);
  return data as SeasonRow;
}

export async function updateSeasonPlayers(seasonId: string, players: Player[]): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('seasons').update({ players }).eq('id', seasonId);
  if (error) throw new SeasonApiError(error.message, error);
}

export async function renameSeason(seasonId: string, name: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('seasons').update({ name }).eq('id', seasonId);
  if (error) throw new SeasonApiError(error.message, error);
}

export async function archiveSeason(
  seasonId: string,
  input: { endsOn: string; finalRankings: PlayerStat[]; championPlayerId?: string }
): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('seasons')
    .update({
      status: 'archived',
      ends_on: input.endsOn,
      final_rankings: input.finalRankings,
      champion_player_id: input.championPlayerId ?? null,
    })
    .eq('id', seasonId);
  if (error) throw new SeasonApiError(error.message, error);
}

/** 시즌과 소속 경기 전체 삭제 (실수로 만든 시즌 정리용 — 경기는 CASCADE) */
export async function deleteSeason(seasonId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('seasons').delete().eq('id', seasonId);
  if (error) throw new SeasonApiError(error.message, error);
}

// ── 경기 쓰기 (관리자) ───────────────────────────────────────

export async function upsertLeagueMatch(seasonId: string, match: Match): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('league_matches').upsert({
    id: match.id,
    season_id: seasonId,
    match_date: match.date,
    match,
  });
  if (error) throw new SeasonApiError(error.message, error);
}

export async function deleteLeagueMatch(matchId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('league_matches').delete().eq('id', matchId);
  if (error) throw new SeasonApiError(error.message, error);
}

// ── 친선경기 (friendly_matches — 리그 밖 경기, 투어 랭킹 반영) ──

/** 특정 날짜 이후의 친선경기 조회 (리그 화면 병합용) */
export async function fetchFriendlyMatchesSince(dateFrom: string): Promise<Match[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('friendly_matches')
    .select('match')
    .gte('match_date', dateFrom)
    .order('match_date', { ascending: true });
  if (error) throw new SeasonApiError(error.message, error);
  return parseMatches(data ?? []);
}

/** 친선경기 저장 — isFriendly 플래그는 앱 내부 라우팅용이므로 벗겨서 저장한다
    (투어 랭킹이 저장된 match를 리그와 동일 규칙으로 재계산하기 때문) */
export async function upsertFriendlyMatch(match: Match): Promise<void> {
  const supabase = requireSupabase();
  const clean = { ...match };
  delete clean.isFriendly;
  const { error } = await supabase.from('friendly_matches').upsert({
    id: match.id,
    match_date: match.date,
    match: clean,
  });
  if (error) throw new SeasonApiError(error.message, error);
}

export async function deleteFriendlyMatch(matchId: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('friendly_matches').delete().eq('id', matchId);
  if (error) throw new SeasonApiError(error.message, error);
}

// ── 실시간 구독 ──────────────────────────────────────────────

export interface LiveSeasonSubscriptionHandlers {
  onMatchUpsert?: (match: Match) => void;
  onMatchDelete?: (matchId: string) => void;
  onSeasonChange?: (season: SeasonRow) => void;
  onStatus?: (status: 'connected' | 'disconnected') => void;
}

/** live 시즌의 경기/메타 변경을 구독한다. 반환값을 호출하면 구독 해제. */
export function subscribeLiveSeason(
  seasonId: string,
  handlers: LiveSeasonSubscriptionHandlers
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`season-${seasonId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'league_matches', filter: `season_id=eq.${seasonId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as { id?: string };
          if (oldRow?.id) handlers.onMatchDelete?.(oldRow.id);
          return;
        }
        const newRow = payload.new as { match?: unknown };
        const parsed = MatchSchema.safeParse(newRow?.match);
        if (parsed.success) handlers.onMatchUpsert?.(parsed.data);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'seasons', filter: `id=eq.${seasonId}` },
      (payload) => handlers.onSeasonChange?.(payload.new as SeasonRow)
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') handlers.onStatus?.('connected');
      else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') handlers.onStatus?.('disconnected');
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
