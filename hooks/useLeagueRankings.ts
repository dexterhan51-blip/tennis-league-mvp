import { useMemo } from 'react';
import { Player, Match, PlayerStat, PlayerWithRank, PlayerCareerStats } from '@/types';
import { calculateRanking } from '@/utils/tennisLogic';
import { calculateCareerRanking } from '@/utils/careerStats';

interface UseLeagueRankingsResult {
  rankings: PlayerStat[];
  rankingsWithChange: PlayerWithRank[];
  matchDates: string[];
}

// 시즌 최고 순위: 완료된 경기 날짜를 순서대로 재생하며 각 시점의 순위를 계산한다.
// 경기를 1번 이상 뛴 선수만 순위에 포함 — 0경기 로스터가 시즌 초반 자리 순서로
// "최고 1~2위"를 선점하던 오염을 막고, 저장값 없이 항상 데이터에서 재계산되므로
// 기기 간 값이 일치한다.
export function calculateSeasonPeaks(players: Player[], matches: Match[]): Map<string, number> {
  const peaks = new Map<string, number>();
  const dates = [...new Set(matches.filter(m => m.isFinished).map(m => m.date))].sort();

  dates.forEach(date => {
    const matchesUpTo = matches.filter(m => m.date <= date);
    const played = calculateRanking(players, matchesUpTo).filter(s => s.matchesPlayed > 0);
    played.forEach((s, idx) => {
      const rank = idx + 1;
      const prev = peaks.get(s.playerId);
      if (prev === undefined || rank < prev) peaks.set(s.playerId, rank);
    });
  });

  return peaks;
}

export function useLeagueRankings(
  players: Player[],
  matches: Match[],
  previousRankings: Record<string, number>,
  careerStats?: PlayerCareerStats[],
): UseLeagueRankingsResult {
  const rankings = useMemo(() => calculateRanking(players, matches), [players, matches]);

  const seasonPeaks = useMemo(
    () => calculateSeasonPeaks(players, matches),
    [players, matches]
  );

  const rankingsWithChange: PlayerWithRank[] = useMemo(() => {
    const careerMap = new Map(
      (careerStats ?? []).map(c => [c.playerId, c])
    );
    // 통산 랭킹은 남자(ATP)/여자(WTA)를 분리해 성별 그룹 안에서 계산
    const genderOf = new Map(players.map(p => [p.id, p.gender]));
    const careerRankMap = calculateCareerRanking(careerStats ?? [], genderOf);

    return rankings.map((r, idx) => {
      const currentRank = idx + 1;
      const previousRank = previousRankings[r.playerId];
      const rankChange = previousRank !== undefined ? previousRank - currentRank : 0;

      // 최고 순위: 시즌 리플레이 최고점과 통산(아카이브) 최고점 중 더 좋은 쪽
      const seasonPeak = seasonPeaks.get(r.playerId);
      const careerPeak = careerMap.get(r.playerId)?.peakRank;
      const candidates = [seasonPeak, careerPeak].filter((v): v is number => v !== undefined);
      const overallPeak = candidates.length > 0 ? Math.min(...candidates) : undefined;

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
  }, [rankings, previousRankings, careerStats, players, seasonPeaks]);

  const matchDates = useMemo(() => {
    return [...new Set(matches.map(m => m.date))];
  }, [matches]);

  return { rankings, rankingsWithChange, matchDates };
}
