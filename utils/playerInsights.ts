// 선수 한 명의 관점에서 경기 기록을 읽는 순수 함수 모음 (오늘·나 화면용).
// 순위·점수 규칙은 calculateRanking을 그대로 쓴다 — 여기서 규칙을 다시 만들지 않는다.

import type { Match, Player, PlayerStat, Team } from '@/types';
import { calculateRanking, isGuestPlayer } from './tennisLogic';

/** 팀 구성원 (단식은 man.id === woman.id → 1명) */
export function teamMembers(team: Team): Player[] {
  if (!team?.man) return [];
  return team.man.id === team.woman?.id ? [team.man] : [team.man, team.woman].filter(Boolean);
}

export function teamLabel(team: Team): string {
  return teamMembers(team).map((p) => p.name).join(' · ') || '미정';
}

/** 이 선수가 속한 쪽. 경기에 없으면 null */
export function sideOf(match: Match, playerId: string): 'A' | 'B' | null {
  if (teamMembers(match.teamA).some((p) => p.id === playerId)) return 'A';
  if (teamMembers(match.teamB).some((p) => p.id === playerId)) return 'B';
  return null;
}

export type MatchOutcome = 'W' | 'L' | 'D';

/** 끝난 경기에서 이 선수의 결과. 미완료이거나 경기에 없으면 null */
export function outcomeFor(match: Match, playerId: string): MatchOutcome | null {
  if (!match.isFinished) return null;
  const side = sideOf(match, playerId);
  if (!side) return null;
  if (match.scoreA === match.scoreB) return 'D';
  const won = side === 'A' ? match.scoreA > match.scoreB : match.scoreB > match.scoreA;
  return won ? 'W' : 'L';
}

/** 순위에 반영되는 경기만 (시범·친선 제외) */
function ranked(matches: Match[]): Match[] {
  return matches.filter((m) => !m.isExhibition && !m.isFriendly);
}

/** 이 선수가 뛴 끝난 경기, 최신순 (같은 날은 입력 순서의 역순) */
export function matchesOf(matches: Match[], playerId: string): Match[] {
  return matches
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.isFinished && sideOf(m, playerId))
    .sort((a, b) => (b.m.date || '').localeCompare(a.m.date || '') || b.i - a.i)
    .map(({ m }) => m);
}

/** 최근 n경기 결과, 오래된 것 → 최신 순 */
export function recentForm(matches: Match[], playerId: string, n = 5): MatchOutcome[] {
  return matchesOf(ranked(matches), playerId)
    .slice(0, n)
    .map((m) => outcomeFor(m, playerId) as MatchOutcome)
    .reverse();
}

export interface RankPoint {
  date: string;
  rank: number;
  points: number;
}

/**
 * 경기일마다 그 시점까지의 순위. 한 경기도 안 뛴 날짜 구간은 건너뛴다
 * (0경기 선수가 명단 순서로 순위를 차지하는 오염 방지 — calculateSeasonPeaks와 같은 기준).
 */
export function rankTimeline(players: Player[], matches: Match[], playerId: string): RankPoint[] {
  const finished = ranked(matches).filter((m) => m.isFinished);
  const dates = [...new Set(finished.map((m) => m.date))].sort();
  const timeline: RankPoint[] = [];
  for (const date of dates) {
    const played = calculateRanking(players, finished.filter((m) => m.date <= date)).filter(
      (s) => s.matchesPlayed > 0
    );
    const idx = played.findIndex((s) => s.playerId === playerId);
    if (idx >= 0) timeline.push({ date, rank: idx + 1, points: played[idx].totalPoints });
  }
  return timeline;
}

export interface Standing {
  /** 경기를 뛴 선수만 줄 세운 순위표 */
  table: PlayerStat[];
  rank: number | null;
  stat: PlayerStat | null;
  /** 직전 경기일 대비 순위 변화 (+면 상승). 비교할 이전 순위가 없으면 null */
  change: number | null;
  /** 바로 윗순위와의 점수 차. 1위이거나 순위가 없으면 null */
  gapAbove: number | null;
}

export function standingOf(players: Player[], matches: Match[], playerId: string | null): Standing {
  const table = calculateRanking(players, matches).filter((s) => s.matchesPlayed > 0);
  if (!playerId) return { table, rank: null, stat: null, change: null, gapAbove: null };
  const idx = table.findIndex((s) => s.playerId === playerId);
  if (idx < 0) return { table, rank: null, stat: null, change: null, gapAbove: null };

  const timeline = rankTimeline(players, matches, playerId);
  const prev = timeline.length >= 2 ? timeline[timeline.length - 2].rank : null;
  return {
    table,
    rank: idx + 1,
    stat: table[idx],
    change: prev === null ? null : prev - (idx + 1),
    gapAbove: idx > 0 ? table[idx - 1].totalPoints - table[idx].totalPoints : null,
  };
}

export interface PairRecord {
  playerId: string;
  name: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  /** 0~100 */
  winRate: number;
}

function tally(
  matches: Match[],
  playerId: string,
  pick: (match: Match, side: 'A' | 'B') => Player[]
): PairRecord[] {
  const map = new Map<string, PairRecord>();
  for (const m of matches) {
    const outcome = outcomeFor(m, playerId);
    const side = sideOf(m, playerId);
    if (!outcome || !side) continue;
    for (const other of pick(m, side)) {
      if (other.id === playerId) continue;
      // 이름 없는 공용 게스트(guest-male/female)는 매번 다른 사람이라 묶지 않는다
      if (isGuestPlayer(other.id) && !other.id.startsWith('guest-named-')) continue;
      const rec =
        map.get(other.id) ??
        { playerId: other.id, name: other.name, played: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
      rec.played++;
      if (outcome === 'W') rec.wins++;
      else if (outcome === 'L') rec.losses++;
      else rec.draws++;
      map.set(other.id, rec);
    }
  }
  return [...map.values()]
    .map((r) => ({ ...r, winRate: r.played > 0 ? (r.wins / r.played) * 100 : 0 }))
    .sort((a, b) => b.played - a.played || b.winRate - a.winRate);
}

/** 같은 편으로 뛴 선수별 성적 (많이 뛴 순) */
export function partnerRecords(matches: Match[], playerId: string): PairRecord[] {
  return tally(matches, playerId, (m, side) => teamMembers(side === 'A' ? m.teamA : m.teamB));
}

/** 상대편으로 만난 선수별 성적 (많이 만난 순) */
export function opponentRecords(matches: Match[], playerId: string): PairRecord[] {
  return tally(matches, playerId, (m, side) => teamMembers(side === 'A' ? m.teamB : m.teamA));
}
