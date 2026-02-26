import { useMemo } from 'react';
import { Player, Match, PlayerStat, PlayerWithRank } from '@/types';
import { calculateRanking } from '@/utils/tennisLogic';

interface UseLeagueRankingsResult {
  rankings: PlayerStat[];
  rankingsWithChange: PlayerWithRank[];
  matchDates: string[];
}

export function useLeagueRankings(
  players: Player[],
  matches: Match[],
  previousRankings: Record<string, number>,
): UseLeagueRankingsResult {
  const rankings = useMemo(() => calculateRanking(players, matches), [players, matches]);

  const rankingsWithChange: PlayerWithRank[] = useMemo(() => {
    return rankings.map((r, idx) => {
      const currentRank = idx + 1;
      const previousRank = previousRankings[r.playerId];
      const rankChange = previousRank !== undefined ? previousRank - currentRank : 0;
      return {
        ...r,
        currentRank,
        previousRank,
        rankChange,
      };
    });
  }, [rankings, previousRankings]);

  const matchDates = useMemo(() => {
    return [...new Set(matches.map(m => m.date))];
  }, [matches]);

  return { rankings, rankingsWithChange, matchDates };
}
