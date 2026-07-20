// 투어 종합 랭킹: 각 리그(대회)의 점수와 친선경기 점수를 선수 id 기준으로 합산한다.
// 점수 규칙은 리그와 동일(참석 1점/일 + 승리 1점) — calculateRanking을 그대로 재사용해 보장.

import { Player, Match, Gender, FriendlyMatchRow, TourRankingEntry, TourLeagueBreakdown } from '@/types';
import { calculateRanking, isGuestPlayer } from './tennisLogic';

export interface TourLeagueSource {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
}

function filterByYear(matches: Match[], year?: number): Match[] {
  if (year === undefined) return matches;
  const prefix = `${year}-`;
  return matches.filter((m) => (m.date || '').startsWith(prefix));
}

/** 팀에서 선수 추출 (단식은 man.id === woman.id → 1명) */
function teamPlayers(team: Match['teamA']): Player[] {
  if (!team?.man) return [];
  return team.man.id === team.woman?.id ? [team.man] : [team.man, team.woman].filter(Boolean);
}

function matchPlayers(m: Match): Player[] {
  return [...teamPlayers(m.teamA), ...teamPlayers(m.teamB)];
}

function emptyEntry(playerId: string, name: string, gender: Gender): TourRankingEntry {
  return {
    playerId, name, gender,
    totalPoints: 0, wins: 0, draws: 0, losses: 0, matchesPlayed: 0, winRate: 0,
    perLeague: [], friendlyPoints: 0, friendlyWins: 0, friendlyMatchesPlayed: 0,
  };
}

/**
 * 투어 종합 랭킹 계산.
 * @param year undefined면 통산, 지정하면 해당 연도 경기(date 기준)만 집계
 */
export function calculateTourRanking(
  leagues: TourLeagueSource[],
  friendly: FriendlyMatchRow[],
  year?: number
): TourRankingEntry[] {
  const entries = new Map<string, TourRankingEntry>();

  const accumulate = (
    playerId: string, name: string, gender: Gender,
    stat: { totalPoints: number; wins: number; draws: number; losses: number; matchesPlayed: number },
    breakdown?: TourLeagueBreakdown
  ) => {
    let e = entries.get(playerId);
    if (!e) {
      e = emptyEntry(playerId, name, gender);
      entries.set(playerId, e);
    }
    // 최신 소스의 이름으로 갱신 (리그별 스냅샷 이름이 다를 수 있음)
    e.name = name;
    e.totalPoints += stat.totalPoints;
    e.wins += stat.wins;
    e.draws += stat.draws;
    e.losses += stat.losses;
    e.matchesPlayed += stat.matchesPlayed;
    if (breakdown) {
      e.perLeague.push(breakdown);
    } else {
      e.friendlyPoints += stat.totalPoints;
      e.friendlyWins += stat.wins;
      e.friendlyMatchesPlayed += stat.matchesPlayed;
    }
  };

  // 1) 리그(대회)별 합산 — bonusPoints는 투어 집계에서 제외(연도 탭마다 중복 반영 방지)
  leagues.forEach((league) => {
    const filtered = filterByYear(league.matches || [], year);
    if (filtered.length === 0) return;
    const playersNoBonus = (league.players || []).map((p) => ({ ...p, bonusPoints: 0 }));
    const stats = calculateRanking(playersNoBonus, filtered);
    stats.forEach((s) => {
      if (s.matchesPlayed === 0 && s.totalPoints === 0) return; // 미출전 로스터 제외
      accumulate(s.playerId, s.name, s.gender, s, {
        leagueId: league.id,
        leagueName: league.name,
        points: s.totalPoints,
        wins: s.wins,
        matchesPlayed: s.matchesPlayed,
      });
    });
  });

  // 2) 친선경기 합산 — 스냅샷에서 참가 선수를 수집해 동일 규칙으로 계산
  const friendlyMatches = filterByYear(
    friendly.map((f) => f.match).filter((m) => m && m.isFinished),
    year
  );
  if (friendlyMatches.length > 0) {
    const friendlyPlayers = new Map<string, Player>();
    friendlyMatches.forEach((m) => {
      matchPlayers(m).forEach((p) => {
        if (!p?.id || isGuestPlayer(p.id)) return;
        friendlyPlayers.set(p.id, { ...p, bonusPoints: 0 });
      });
    });
    const stats = calculateRanking(Array.from(friendlyPlayers.values()), friendlyMatches);
    stats.forEach((s) => {
      if (s.matchesPlayed === 0 && s.totalPoints === 0) return;
      accumulate(s.playerId, s.name, s.gender, s);
    });
  }

  return Array.from(entries.values())
    .map((e) => {
      e.winRate = e.matchesPlayed > 0 ? (e.wins / e.matchesPlayed) * 100 : 0;
      return e;
    })
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints || b.winRate - a.winRate || a.name.localeCompare(b.name, 'ko')
    );
}

/** 데이터가 있는 연도 목록 (내림차순) — 연도 탭용 */
export function collectYears(leagues: TourLeagueSource[], friendly: FriendlyMatchRow[]): number[] {
  const years = new Set<number>();
  const addDate = (date?: string) => {
    const y = parseInt((date || '').slice(0, 4), 10);
    if (!isNaN(y) && y > 2000) years.add(y);
  };
  leagues.forEach((l) => (l.matches || []).forEach((m) => addDate(m.date)));
  friendly.forEach((f) => addDate(f.match_date || f.match?.date));
  return Array.from(years).sort((a, b) => b - a);
}

/** 리그 로스터 + 친선 스냅샷에서 비게스트 선수 전체 수집 (친선 입력 선택 목록용) */
export function collectAllPlayers(
  leagues: TourLeagueSource[],
  friendly: FriendlyMatchRow[]
): Player[] {
  const map = new Map<string, Player>();
  leagues.forEach((l) =>
    (l.players || []).forEach((p) => {
      if (p?.id && !isGuestPlayer(p.id)) map.set(p.id, p);
    })
  );
  friendly.forEach((f) =>
    matchPlayers(f.match || ({} as Match)).forEach((p) => {
      if (p?.id && !isGuestPlayer(p.id) && !map.has(p.id)) map.set(p.id, p);
    })
  );
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}
