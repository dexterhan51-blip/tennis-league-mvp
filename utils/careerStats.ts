import type { SeasonArchive, PlayerCareerStats, SeasonRecord, PlayerStat } from '@/types';
import { safeGetAsync, safeSetAsync } from '@/lib/storage';
import { PlayerCareerStatsArraySchema } from '@/lib/schemas';

const CAREER_STATS_KEY = 'player-career-stats';

export async function loadCareerStats(): Promise<PlayerCareerStats[]> {
  return (await safeGetAsync(CAREER_STATS_KEY, PlayerCareerStatsArraySchema)) ?? [];
}

export async function saveCareerStats(stats: PlayerCareerStats[]): Promise<void> {
  await safeSetAsync(CAREER_STATS_KEY, stats);
}

/**
 * ATP식 통산 랭킹 계산: 아카이브된 전체 시즌의 누적 포인트 기준.
 * 동점이면 통산 승수 → 통산 승률 순으로 가른다.
 * 시즌 기록이 없는 선수는 랭킹에 포함되지 않는다.
 */
export function calculateCareerRanking(careerStats: PlayerCareerStats[]): Map<string, number> {
  const totals = careerStats
    .filter(c => c.seasonHistory.length > 0)
    .map(c => {
      const points = c.seasonHistory.reduce((sum, s) => sum + s.totalPoints, 0);
      const wins = c.seasonHistory.reduce((sum, s) => sum + s.wins, 0);
      const played = c.seasonHistory.reduce((sum, s) => sum + s.matchesPlayed, 0);
      return { playerId: c.playerId, points, wins, winRate: played > 0 ? wins / played : 0 };
    });

  totals.sort((a, b) =>
    b.points - a.points || b.wins - a.wins || b.winRate - a.winRate
  );

  return new Map(totals.map((t, idx) => [t.playerId, idx + 1]));
}

export async function updatePlayerCareerStats(archive: SeasonArchive): Promise<PlayerCareerStats[]> {
  const existing = await loadCareerStats();
  const statsMap = new Map<string, PlayerCareerStats>(
    existing.map(s => [s.playerId, s])
  );

  archive.finalRankings.forEach((ranking: PlayerStat, idx: number) => {
    const finalRank = idx + 1;
    const playerId = ranking.playerId;

    let career = statsMap.get(playerId);
    if (!career) {
      career = {
        playerId,
        peakRank: finalRank,
        peakRankSeason: archive.id,
        peakRankDate: archive.seasonEnd,
        championships: 0,
        seasonHistory: [],
      };
      statsMap.set(playerId, career);
    }

    // Update peak rank (lower is better)
    if (finalRank < career.peakRank) {
      career.peakRank = finalRank;
      career.peakRankSeason = archive.id;
      career.peakRankDate = archive.seasonEnd;
    }

    // Championship count
    if (finalRank === 1) {
      career.championships++;
    }

    // Add season record
    const record: SeasonRecord = {
      seasonId: archive.id,
      leagueName: archive.leagueName,
      finalRank,
      totalPoints: ranking.totalPoints,
      wins: ranking.wins,
      losses: ranking.losses,
      draws: ranking.draws,
      matchesPlayed: ranking.matchesPlayed,
      seasonEnd: archive.seasonEnd,
    };
    career.seasonHistory.push(record);
  });

  const updated = Array.from(statsMap.values());
  await saveCareerStats(updated);
  return updated;
}
