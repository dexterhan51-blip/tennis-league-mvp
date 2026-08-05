import { calculateCareerRanking } from '@/utils/careerStats';
import type { PlayerCareerStats, SeasonRecord } from '@/types';

function season(overrides: Partial<SeasonRecord>): SeasonRecord {
  return {
    seasonId: 's1',
    leagueName: '테스트 리그',
    finalRank: 1,
    totalPoints: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    matchesPlayed: 0,
    seasonEnd: '2026-06-30',
    ...overrides,
  };
}

function career(playerId: string, seasons: Partial<SeasonRecord>[]): PlayerCareerStats {
  return {
    playerId,
    peakRank: 1,
    championships: 0,
    seasonHistory: seasons.map(season),
  };
}

describe('calculateCareerRanking', () => {
  it('누적 포인트가 높은 순으로 랭킹을 매긴다', () => {
    const stats = [
      career('a', [{ totalPoints: 10 }, { totalPoints: 5 }]), // 15
      career('b', [{ totalPoints: 20 }]),                     // 20
      career('c', [{ totalPoints: 8 }]),                      // 8
    ];
    const ranking = calculateCareerRanking(stats);
    expect(ranking.get('b')).toBe(1);
    expect(ranking.get('a')).toBe(2);
    expect(ranking.get('c')).toBe(3);
  });

  it('포인트가 같으면 통산 승수, 그 다음 승률로 가른다', () => {
    const stats = [
      career('fewWins', [{ totalPoints: 10, wins: 3, matchesPlayed: 10 }]),
      career('manyWins', [{ totalPoints: 10, wins: 5, matchesPlayed: 10 }]),
      career('sameWinsBetterRate', [{ totalPoints: 10, wins: 5, matchesPlayed: 8 }]),
    ];
    const ranking = calculateCareerRanking(stats);
    expect(ranking.get('sameWinsBetterRate')).toBe(1);
    expect(ranking.get('manyWins')).toBe(2);
    expect(ranking.get('fewWins')).toBe(3);
  });

  it('시즌 기록이 없는 선수는 랭킹에서 제외한다', () => {
    const stats = [
      career('played', [{ totalPoints: 5 }]),
      career('noSeasons', []),
    ];
    const ranking = calculateCareerRanking(stats);
    expect(ranking.get('played')).toBe(1);
    expect(ranking.has('noSeasons')).toBe(false);
  });

  it('빈 배열이면 빈 랭킹을 반환한다', () => {
    expect(calculateCareerRanking([]).size).toBe(0);
  });

  describe('성별 분리 (ATP/WTA)', () => {
    const genderOf = new Map<string, 'MALE' | 'FEMALE'>([
      ['m1', 'MALE'],
      ['m2', 'MALE'],
      ['w1', 'FEMALE'],
      ['w2', 'FEMALE'],
    ]);

    it('남자끼리, 여자끼리 각각 1위부터 순위를 매긴다', () => {
      const stats = [
        career('m1', [{ totalPoints: 10 }]),
        career('w1', [{ totalPoints: 9 }]),
        career('m2', [{ totalPoints: 8 }]),
        career('w2', [{ totalPoints: 7 }]),
      ];
      const ranking = calculateCareerRanking(stats, genderOf);
      expect(ranking.get('m1')).toBe(1); // ATP 1위
      expect(ranking.get('m2')).toBe(2); // ATP 2위
      expect(ranking.get('w1')).toBe(1); // WTA 1위 (전체 2위지만 여자 중 1위)
      expect(ranking.get('w2')).toBe(2); // WTA 2위
    });

    it('성별을 알 수 없는 선수는 제외된다', () => {
      const stats = [
        career('m1', [{ totalPoints: 10 }]),
        career('unknown', [{ totalPoints: 99 }]), // 명단에 없는 과거 선수
      ];
      const ranking = calculateCareerRanking(stats, genderOf);
      expect(ranking.has('unknown')).toBe(false);
      expect(ranking.get('m1')).toBe(1); // unknown이 순위를 차지하지 않음
    });
  });
});
