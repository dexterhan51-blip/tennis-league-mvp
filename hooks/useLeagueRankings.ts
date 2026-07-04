import { useMemo, useEffect, useRef } from 'react';
import { Player, Match, PlayerStat, PlayerWithRank, PlayerCareerStats } from '@/types';
import { calculateRanking } from '@/utils/tennisLogic';
import { calculateCareerRanking } from '@/utils/careerStats';
import { safeGetAsync, safeSetAsync } from '@/lib/storage';
import { z } from 'zod';

const SeasonPeaksSchema = z.record(z.string(), z.number());
const SEASON_PEAKS_KEY = 'current-season-peaks';

interface UseLeagueRankingsResult {
  rankings: PlayerStat[];
  rankingsWithChange: PlayerWithRank[];
  matchDates: string[];
}

export function useLeagueRankings(
  players: Player[],
  matches: Match[],
  previousRankings: Record<string, number>,
  careerStats?: PlayerCareerStats[],
): UseLeagueRankingsResult {
  const rankings = useMemo(() => calculateRanking(players, matches), [players, matches]);
  const seasonPeaksRef = useRef<Record<string, number>>({});
  const peaksLoadedRef = useRef(false);

  // Load season peaks on mount
  useEffect(() => {
    safeGetAsync(SEASON_PEAKS_KEY, SeasonPeaksSchema).then(peaks => {
      if (peaks) seasonPeaksRef.current = peaks;
      peaksLoadedRef.current = true;
    });
  }, []);

  // Update season peaks whenever rankings change
  useEffect(() => {
    if (!peaksLoadedRef.current) return;
    let changed = false;
    const peaks = { ...seasonPeaksRef.current };

    rankings.forEach((r, idx) => {
      const currentRank = idx + 1;
      const existingPeak = peaks[r.playerId];
      if (existingPeak === undefined || currentRank < existingPeak) {
        peaks[r.playerId] = currentRank;
        changed = true;
      }
    });

    if (changed) {
      seasonPeaksRef.current = peaks;
      safeSetAsync(SEASON_PEAKS_KEY, peaks);
    }
  }, [rankings]);

  const rankingsWithChange: PlayerWithRank[] = useMemo(() => {
    const careerMap = new Map(
      (careerStats ?? []).map(c => [c.playerId, c])
    );
    const careerRankMap = calculateCareerRanking(careerStats ?? []);

    return rankings.map((r, idx) => {
      const currentRank = idx + 1;
      const previousRank = previousRankings[r.playerId];
      const rankChange = previousRank !== undefined ? previousRank - currentRank : 0;

      // Calculate peak rank: best of (season peak, career peak)
      const seasonPeak = seasonPeaksRef.current[r.playerId] ?? currentRank;
      const careerPeak = careerMap.get(r.playerId)?.peakRank;
      const overallPeak = careerPeak !== undefined
        ? Math.min(seasonPeak, careerPeak)
        : seasonPeak;

      return {
        ...r,
        currentRank,
        previousRank,
        rankChange,
        peakRank: overallPeak,
        seasonPeakRank: seasonPeak,
        careerRank: careerRankMap.get(r.playerId),
      };
    });
  }, [rankings, previousRankings, careerStats]);

  const matchDates = useMemo(() => {
    return [...new Set(matches.map(m => m.date))];
  }, [matches]);

  return { rankings, rankingsWithChange, matchDates };
}
