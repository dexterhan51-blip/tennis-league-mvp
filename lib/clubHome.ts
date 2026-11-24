// 첫 화면(클럽 홈)에 필요한 묶음을 만드는 순수 함수.
// 화면 구성: 최근 경기 띠 → 지난 모임 대표 카드 → 다음 모임 → 기간 상위 3 → 기록 리더 → 최근 모임 결과

import type { Match, PlayerStat, ScheduleItem } from '@/types';
import { calculateDailyMvp, calculateRanking } from '@/utils/tennisLogic';
import { teamMembers } from '@/utils/playerInsights';
import { countableMatches, type ClubData, type Scope } from './clubView';

/** 끝난 경기만, 날짜순(같은 날은 기록 순서) */
function finishedMatches(data: ClubData): Match[] {
  return countableMatches(data).filter((m) => m.isFinished && !m.isExhibition);
}

export interface Meeting {
  date: string;
  /** 그날 경기 (기록 순서) */
  matches: Match[];
  /** 편집본 기록에 적힌 장소 중 가장 많이 나온 것 */
  place: string | null;
  mvps: { id: string; name: string; gender: 'MALE' | 'FEMALE'; wins: number; played: number; scoreDiff: number }[];
  /** 영상이 연결된 경기 수 */
  videos: number;
  /** 그날 나온 사람 수 (게스트 포함) */
  people: number;
}

function meetingOf(date: string, all: Match[]): Meeting {
  const matches = all.filter((m) => m.date === date);
  const placeCount = new Map<string, number>();
  for (const m of matches) {
    const p = m.detail?.place;
    if (p) placeCount.set(p, (placeCount.get(p) ?? 0) + 1);
  }
  const place = [...placeCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  let mvps: Meeting['mvps'] = [];
  try {
    const { maleMvp, femaleMvp } = calculateDailyMvp([], matches, date);
    mvps = [maleMvp, femaleMvp]
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .map((x) => ({ id: x.id, name: x.name, gender: x.gender === 'FEMALE' ? 'FEMALE' : 'MALE', wins: x.wins, played: x.played, scoreDiff: x.scoreDiff }));
  } catch {
    mvps = [];
  }
  const people = new Set(matches.flatMap((m) => [...teamMembers(m.teamA), ...teamMembers(m.teamB)].map((p) => p.id))).size;
  return { date, matches, place, mvps, videos: matches.filter((m) => m.videoUrl).length, people };
}

/** 최근 모임들 (최신 먼저) */
export function recentMeetings(data: ClubData, count = 3): Meeting[] {
  const all = finishedMatches(data);
  const dates = [...new Set(all.map((m) => m.date))].sort().reverse().slice(0, count);
  return dates.map((d) => meetingOf(d, all));
}

/** 점수 띠: 가장 마지막 모임의 경기들, 마지막 경기부터 */
export function latestStrip(data: ClubData): { date: string; matches: { match: Match; no: number }[] } | null {
  const [last] = recentMeetings(data, 1);
  if (!last) return null;
  return { date: last.date, matches: last.matches.map((match, i) => ({ match, no: i + 1 })).reverse() };
}

/** 오늘 이후(오늘 포함) 일정, 가까운 순 */
export function upcomingSchedule(data: ClubData, today: string, count = 3): ScheduleItem[] {
  return (data.schedule ?? [])
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, count);
}

export interface RankedRow {
  rank: number;
  stat: PlayerStat;
  /** 직전 모임 대비 순위 변화 (+면 상승). 비교할 이전 순위가 없으면 null */
  change: number | null;
}

/** 기간(또는 시즌) 순위 상위 n명 — 경기를 뛴 사람만 */
export function topRanked(scope: Scope, count = 3): RankedRow[] {
  const table = calculateRanking(scope.players, scope.matches).filter((s) => s.matchesPlayed > 0);
  const dates = [...new Set(scope.matches.filter((m) => m.isFinished).map((m) => m.date))].sort();
  const lastDate = dates[dates.length - 1];
  const before =
    dates.length >= 2
      ? calculateRanking(scope.players, scope.matches.filter((m) => m.date < lastDate)).filter((s) => s.matchesPlayed > 0)
      : [];
  const prev = new Map(before.map((s, i) => [s.playerId, i + 1]));
  return table.slice(0, count).map((stat, i) => ({
    rank: i + 1,
    stat,
    change: prev.has(stat.playerId) ? (prev.get(stat.playerId) as number) - (i + 1) : null,
  }));
}

export interface Leader {
  key: 'wins' | 'winRate' | 'attendance';
  label: string;
  playerId: string;
  name: string;
  /** 화면에 보일 값 (예: '5승', '83%', '4번') */
  value: string;
  /** 값 아래 작은 설명 (예: '6경기') */
  sub: string;
}

/**
 * 기록 리더 세 가지: 최다 승 · 최고 승률(경기 수가 적은 사람이 1위가 되지 않도록 최소 경기 수) · 최다 출석.
 * 같은 값이면 경기를 더 많이 뛴 사람이 앞선다.
 */
export function leaders(scope: Scope): Leader[] {
  const table = calculateRanking(scope.players, scope.matches).filter((s) => s.matchesPlayed > 0);
  if (table.length === 0) return [];
  const out: Leader[] = [];

  const byWins = [...table].sort((a, b) => b.wins - a.wins || b.matchesPlayed - a.matchesPlayed)[0];
  if (byWins.wins > 0) out.push({ key: 'wins', label: '최다 승', playerId: byWins.playerId, name: byWins.name, value: `${byWins.wins}승`, sub: `${byWins.matchesPlayed}경기` });

  const most = Math.max(...table.map((s) => s.matchesPlayed));
  const minGames = Math.min(3, most);
  const byRate = table
    .filter((s) => s.matchesPlayed >= minGames)
    .sort((a, b) => b.winRate - a.winRate || b.matchesPlayed - a.matchesPlayed)[0];
  if (byRate) out.push({ key: 'winRate', label: '최고 승률', playerId: byRate.playerId, name: byRate.name, value: `${Math.round(byRate.winRate)}%`, sub: `${byRate.wins}승 ${byRate.losses}패` });

  const days = new Map<string, Set<string>>();
  for (const m of scope.matches) {
    if (!m.isFinished) continue;
    for (const p of [...teamMembers(m.teamA), ...teamMembers(m.teamB)]) {
      const set = days.get(p.id) ?? new Set<string>();
      set.add(m.date);
      days.set(p.id, set);
    }
  }
  const byDays = [...table].sort(
    (a, b) => (days.get(b.playerId)?.size ?? 0) - (days.get(a.playerId)?.size ?? 0) || b.matchesPlayed - a.matchesPlayed
  )[0];
  const n = days.get(byDays.playerId)?.size ?? 0;
  if (n > 0) out.push({ key: 'attendance', label: '최다 출석', playerId: byDays.playerId, name: byDays.name, value: `${n}번`, sub: `${byDays.matchesPlayed}경기` });

  return out;
}
