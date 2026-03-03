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
