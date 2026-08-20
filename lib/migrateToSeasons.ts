// 구버전 데이터 → 시즌 타임라인 1회 이전 도구.
// · 이 기기의 로컬 시즌 아카이브(season-history) → archived 시즌 + 경기 행
// · 구 shared_leagues 활성 리그(JSONB 블랍) → 최신 1개는 live 시즌, 나머지는 archived
// 원본(shared_leagues, 로컬 아카이브)은 지우지 않고 백업으로 남긴다.

import type { Match, Player, PlayerStat } from '@/types';
import { MatchSchema, SeasonHistorySchema } from '@/lib/schemas';
import { safeGetAsync } from '@/lib/storage';
import { getSupabase } from '@/lib/supabase';
import { calculateRanking } from '@/utils/tennisLogic';

interface LegacyBlob {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
  updated_at: string;
}

export interface MigrationPreview {
  localArchives: number;
  serverLeagues: number;
  existingSeasons: number;
}

export interface MigrationResult {
  seasons: number;
  matches: number;
  skippedMatches: number;
}

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');
  return supabase;
}

async function fetchLegacyBlobs(): Promise<LegacyBlob[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('shared_leagues')
    .select('id, name, players, matches, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false });
  if (error) {
    // 구 테이블이 없으면(신규 설치) 이전할 서버 데이터도 없다
    console.warn('[migrate] shared_leagues read failed:', error.message);
    return [];
  }
  return (data as LegacyBlob[]) ?? [];
}

export async function previewMigration(): Promise<MigrationPreview> {
  const supabase = requireSupabase();
  const [archives, blobs, seasonsRes] = await Promise.all([
    safeGetAsync('season-history', SeasonHistorySchema).then((h) => h ?? []),
    fetchLegacyBlobs(),
    supabase.from('seasons').select('id'),
  ]);
  if (seasonsRes.error) throw new Error(seasonsRes.error.message);
  return {
    localArchives: archives.length,
    serverLeagues: blobs.length,
    existingSeasons: seasonsRes.data?.length ?? 0,
  };
}

function validMatches(matches: Match[], skipped: { count: number }): Match[] {
  const seen = new Set<string>();
  const result: Match[] = [];
  for (const raw of matches ?? []) {
    const parsed = MatchSchema.safeParse(raw);
    if (!parsed.success || seen.has(parsed.data.id)) {
      skipped.count++;
      continue;
    }
    seen.add(parsed.data.id);
    result.push(parsed.data);
  }
  return result;
}

async function insertSeasonWithMatches(
  input: {
    seasonNo: number;
    name: string;
    status: 'live' | 'archived';
    players: Player[];
    startsOn: string | null;
    endsOn: string | null;
    finalRankings: PlayerStat[] | null;
    championPlayerId: string | null;
    matches: Match[];
  },
  skipped: { count: number }
): Promise<number> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('seasons')
    .insert({
      season_no: input.seasonNo,
      name: input.name,
      status: input.status,
      players: input.players ?? [],
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      final_rankings: input.finalRankings,
      champion_player_id: input.championPlayerId,
    })
    .select('id')
    .single();
  if (error) throw new Error(`시즌 생성 실패 (${input.name}): ${error.message}`);

  const seasonId = data.id as string;
  const rows = validMatches(input.matches, skipped).map((m) => ({
    id: m.id,
    season_id: seasonId,
    match_date: m.date || input.startsOn || '',
    match: m,
  }));

  // 대량 삽입은 200건씩 나눠서 (upsert: 재실행 안전)
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error: mErr } = await supabase.from('league_matches').upsert(chunk);
    if (mErr) throw new Error(`경기 이전 실패 (${input.name}): ${mErr.message}`);
  }
  return rows.length;
}

/**
 * 구버전 데이터를 시즌 타임라인으로 이전한다.
 * seasons 테이블이 비어 있을 때만 실행할 것 (previewMigration으로 확인).
 */
export async function runMigration(): Promise<MigrationResult> {
  const [archives, blobs] = await Promise.all([
    safeGetAsync('season-history', SeasonHistorySchema).then((h) => h ?? []),
    fetchLegacyBlobs(),
  ]);

  const skipped = { count: 0 };
  let seasonCount = 0;
  let matchCount = 0;
  let seasonNo = 0;

  // 1) 로컬 아카이브 → archived 시즌 (종료일 순)
  const sortedArchives = [...archives].sort((a, b) =>
    (a.seasonEnd || '').localeCompare(b.seasonEnd || '')
  );
  for (const a of sortedArchives) {
    seasonNo++;
    matchCount += await insertSeasonWithMatches(
      {
        seasonNo,
        name: a.leagueName,
        status: 'archived',
        players: a.players,
        startsOn: a.seasonStart || null,
        endsOn: a.seasonEnd || null,
        finalRankings: a.finalRankings ?? null,
        championPlayerId: a.championPlayerId ?? null,
        matches: a.matches,
      },
      skipped
    );
    seasonCount++;
  }

  // 2) 구 shared_leagues → 최신 1개는 live, 나머지는 archived(최종 순위 계산해 기록)
  const [liveBlob, ...restBlobs] = blobs;
  for (const blob of [...restBlobs].reverse()) {
    seasonNo++;
    const finalRankings = safeRanking(blob);
    const dates = matchDatesOf(blob.matches);
    matchCount += await insertSeasonWithMatches(
      {
        seasonNo,
        name: blob.name,
        status: 'archived',
        players: blob.players ?? [],
        startsOn: dates[0] ?? null,
        endsOn: dates[dates.length - 1] ?? null,
        finalRankings,
        championPlayerId: finalRankings?.[0]?.playerId ?? null,
        matches: blob.matches ?? [],
      },
      skipped
    );
    seasonCount++;
  }
  if (liveBlob) {
    seasonNo++;
    const dates = matchDatesOf(liveBlob.matches);
    matchCount += await insertSeasonWithMatches(
      {
        seasonNo,
        name: liveBlob.name,
        status: 'live',
        players: liveBlob.players ?? [],
        startsOn: dates[0] ?? new Date().toISOString().split('T')[0],
        endsOn: null,
        finalRankings: null,
        championPlayerId: null,
        matches: liveBlob.matches ?? [],
      },
      skipped
    );
    seasonCount++;
  }

  return { seasons: seasonCount, matches: matchCount, skippedMatches: skipped.count };
}

function matchDatesOf(matches: Match[] | null | undefined): string[] {
  return [...new Set((matches ?? []).map((m) => m.date).filter(Boolean))].sort();
}

function safeRanking(blob: LegacyBlob): PlayerStat[] | null {
  try {
    return calculateRanking(blob.players ?? [], blob.matches ?? []);
  } catch {
    return null;
  }
}
