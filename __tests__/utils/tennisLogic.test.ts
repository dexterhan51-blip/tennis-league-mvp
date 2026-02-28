import { Player, Match } from '@/types';
import {
  calculateRanking,
  calculateDailyMvp,
  generateMixedDoublesSchedule,
  generateDoubles,
  generateSingles,
  isGuestPlayer,
  GUEST_M_ID,
  GUEST_F_ID,
} from '@/utils/tennisLogic';

// --- Helper factories ---

const makePlayer = (id: string, name: string, gender: 'MALE' | 'FEMALE', bonusPoints?: number): Player => ({
  id,
  name,
  gender,
  ...(bonusPoints !== undefined ? { bonusPoints } : {}),
});

const makeMatch = (
  overrides: Partial<Match> & { teamAManId?: string; teamAWomanId?: string; teamBManId?: string; teamBWomanId?: string } = {},
): Match => {
  const p = (id: string, name: string, gender: 'MALE' | 'FEMALE'): Player => ({ id, name, gender });
  return {
    id: overrides.id || 'match-1',
    date: overrides.date || '2026-01-01',
    teamA: overrides.teamA || {
      id: 'ta',
      man: p('m1', 'M1', 'MALE'),
      woman: p('w1', 'W1', 'FEMALE'),
    },
    teamB: overrides.teamB || {
      id: 'tb',
      man: p('m2', 'M2', 'MALE'),
      woman: p('w2', 'W2', 'FEMALE'),
    },
    scoreA: overrides.scoreA ?? 0,
    scoreB: overrides.scoreB ?? 0,
    isFinished: overrides.isFinished ?? false,
  };
};

// --- calculateRanking ---

describe('calculateRanking', () => {
  const m1 = makePlayer('m1', 'M1', 'MALE');
  const m2 = makePlayer('m2', 'M2', 'MALE');
  const w1 = makePlayer('w1', 'W1', 'FEMALE');
  const w2 = makePlayer('w2', 'W2', 'FEMALE');

  it('returns empty array for empty data', () => {
    expect(calculateRanking([], [])).toEqual([]);
  });

  it('returns players with 0 stats when there are no matches', () => {
    const result = calculateRanking([m1, w1], []);
    expect(result).toHaveLength(2);
    expect(result[0].matchesPlayed).toBe(0);
    expect(result[0].totalPoints).toBe(0);
  });

  it('awards daily attendance(1) + win(1) = 2pts, loss gets attendance(1) only', () => {
    const match = makeMatch({
      teamA: { id: 'ta', man: m1, woman: w1 },
      teamB: { id: 'tb', man: m2, woman: w2 },
      scoreA: 6,
      scoreB: 3,
      isFinished: true,
    });

    const result = calculateRanking([m1, m2, w1, w2], [match]);

    const m1Stats = result.find(r => r.playerId === 'm1')!;
    const m2Stats = result.find(r => r.playerId === 'm2')!;
    // 승리: 참석 1 + 승점 1 = 2
    expect(m1Stats.wins).toBe(1);
    expect(m1Stats.totalPoints).toBe(2);
    // 패배: 참석 1 + 승점 0 = 1
    expect(m2Stats.losses).toBe(1);
    expect(m2Stats.totalPoints).toBe(1);
  });

  it('attendance point is once per day regardless of games played', () => {
    // 같은 날 4경기, 1승 3패
    const matches = [
      makeMatch({ id: 'g1', date: '2026-01-01', teamA: { id: 'ta1', man: m1, woman: w1 }, teamB: { id: 'tb1', man: m2, woman: w2 }, scoreA: 6, scoreB: 3, isFinished: true }),
      makeMatch({ id: 'g2', date: '2026-01-01', teamA: { id: 'ta2', man: m1, woman: w1 }, teamB: { id: 'tb2', man: m2, woman: w2 }, scoreA: 2, scoreB: 6, isFinished: true }),
      makeMatch({ id: 'g3', date: '2026-01-01', teamA: { id: 'ta3', man: m1, woman: w1 }, teamB: { id: 'tb3', man: m2, woman: w2 }, scoreA: 3, scoreB: 6, isFinished: true }),
      makeMatch({ id: 'g4', date: '2026-01-01', teamA: { id: 'ta4', man: m1, woman: w1 }, teamB: { id: 'tb4', man: m2, woman: w2 }, scoreA: 1, scoreB: 6, isFinished: true }),
    ];

    const result = calculateRanking([m1, m2, w1, w2], matches);
    const m1Stats = result.find(r => r.playerId === 'm1')!;
    // m1: 1승 3패, 하루 참석 1점 + 승점 1점 = 2점
    expect(m1Stats.matchesPlayed).toBe(4);
    expect(m1Stats.wins).toBe(1);
    expect(m1Stats.losses).toBe(3);
    expect(m1Stats.totalPoints).toBe(2);

    const m2Stats = result.find(r => r.playerId === 'm2')!;
    // m2: 3승 1패, 하루 참석 1점 + 승점 3점 = 4점
    expect(m2Stats.wins).toBe(3);
    expect(m2Stats.losses).toBe(1);
    expect(m2Stats.totalPoints).toBe(4);
  });

  it('attendance point accumulates per different day', () => {
    // 2일간 각 1경기
    const matches = [
      makeMatch({ id: 'g1', date: '2026-01-01', teamA: { id: 'ta1', man: m1, woman: w1 }, teamB: { id: 'tb1', man: m2, woman: w2 }, scoreA: 6, scoreB: 3, isFinished: true }),
      makeMatch({ id: 'g2', date: '2026-01-02', teamA: { id: 'ta2', man: m1, woman: w1 }, teamB: { id: 'tb2', man: m2, woman: w2 }, scoreA: 6, scoreB: 3, isFinished: true }),
    ];

    const result = calculateRanking([m1, m2, w1, w2], matches);
    const m1Stats = result.find(r => r.playerId === 'm1')!;
    // m1: 2일 참석(2점) + 2승(2점) = 4점
    expect(m1Stats.totalPoints).toBe(4);

    const m2Stats = result.find(r => r.playerId === 'm2')!;
    // m2: 2일 참석(2점) + 0승(0점) = 2점
    expect(m2Stats.totalPoints).toBe(2);
  });

  it('draw gives attendance only, no win points', () => {
    const match = makeMatch({
      teamA: { id: 'ta', man: m1, woman: w1 },
      teamB: { id: 'tb', man: m2, woman: w2 },
      scoreA: 4,
      scoreB: 4,
      isFinished: true,
    });

    const result = calculateRanking([m1, m2, w1, w2], [match]);

    const m1Stats = result.find(r => r.playerId === 'm1')!;
    // 무승부: 참석 1점 + 승점 0 = 1점
    expect(m1Stats.matchesPlayed).toBe(1);
    expect(m1Stats.wins).toBe(0);
    expect(m1Stats.draws).toBe(1);
    expect(m1Stats.losses).toBe(0);
    expect(m1Stats.totalPoints).toBe(1);
  });

  it('excludes guest players', () => {
    const guestM = makePlayer(GUEST_M_ID, 'Guest M', 'MALE');
    const guestF = makePlayer(GUEST_F_ID, 'Guest F', 'FEMALE');
    const result = calculateRanking([m1, guestM, guestF], []);
    expect(result).toHaveLength(1);
    expect(result[0].playerId).toBe('m1');
  });

  it('excludes dynamic guest players (guest-male-1, guest-female-2, etc.)', () => {
    const g1 = makePlayer('guest-male-1', '게스트(남)1', 'MALE');
    const g2 = makePlayer('guest-male-2', '게스트(남)2', 'MALE');
    const g3 = makePlayer('guest-female-1', '게스트(여)', 'FEMALE');
    const result = calculateRanking([m1, g1, g2, g3], []);
    expect(result).toHaveLength(1);
    expect(result[0].playerId).toBe('m1');
  });

  it('reflects bonusPoints in totalPoints', () => {
    const m1WithBonus = makePlayer('m1', 'M1', 'MALE', 5);
    const result = calculateRanking([m1WithBonus], []);
    expect(result[0].totalPoints).toBe(5);
  });

  it('ignores unfinished matches', () => {
    const match = makeMatch({
      teamA: { id: 'ta', man: m1, woman: w1 },
      teamB: { id: 'tb', man: m2, woman: w2 },
      scoreA: 6,
      scoreB: 3,
      isFinished: false,
    });

    const result = calculateRanking([m1, m2, w1, w2], [match]);
    result.forEach(r => {
      expect(r.matchesPlayed).toBe(0);
    });
  });

  it('sorts by totalPoints descending, then winRate', () => {
    const match1 = makeMatch({
      id: 'match1',
      teamA: { id: 'ta1', man: m1, woman: w1 },
      teamB: { id: 'tb1', man: m2, woman: w2 },
      scoreA: 6,
      scoreB: 3,
      isFinished: true,
    });
    const match2 = makeMatch({
      id: 'match2',
      teamA: { id: 'ta2', man: m1, woman: w1 },
      teamB: { id: 'tb2', man: m2, woman: w2 },
      scoreA: 6,
      scoreB: 2,
      isFinished: true,
    });

    const result = calculateRanking([m1, m2, w1, w2], [match1, match2]);
    // m1 and w1 should be at top (4 points each: 2 wins * 2)
    expect(result[0].totalPoints).toBeGreaterThanOrEqual(result[1].totalPoints);
    expect(result[0].playerId === 'm1' || result[0].playerId === 'w1').toBe(true);
  });
});

// --- calculateDailyMvp ---

describe('calculateDailyMvp', () => {
  const m1 = makePlayer('m1', 'M1', 'MALE');
  const m2 = makePlayer('m2', 'M2', 'MALE');
  const w1 = makePlayer('w1', 'W1', 'FEMALE');
  const w2 = makePlayer('w2', 'W2', 'FEMALE');

  it('returns null MVPs when no matches exist', () => {
    const result = calculateDailyMvp([m1, w1], [], '2026-01-01');
    expect(result.maleMvp).toBeNull();
    expect(result.femaleMvp).toBeNull();
  });

  it('filters only matches from specified date', () => {
    const matchToday = makeMatch({
      id: 'today',
      date: '2026-01-01',
      teamA: { id: 'ta', man: m1, woman: w1 },
      teamB: { id: 'tb', man: m2, woman: w2 },
      scoreA: 6,
      scoreB: 3,
      isFinished: true,
    });
    const matchOther = makeMatch({
      id: 'other',
      date: '2026-01-02',
      teamA: { id: 'ta2', man: m1, woman: w1 },
      teamB: { id: 'tb2', man: m2, woman: w2 },
      scoreA: 3,
      scoreB: 6,
      isFinished: true,
    });

    const result = calculateDailyMvp([m1, m2, w1, w2], [matchToday, matchOther], '2026-01-01');
    // On 2026-01-01, m1 won. On 2026-01-02 (excluded), m2 won.
    expect(result.maleMvp?.id).toBe('m1');
  });

  it('returns one male and one female MVP', () => {
    const match = makeMatch({
      teamA: { id: 'ta', man: m1, woman: w1 },
      teamB: { id: 'tb', man: m2, woman: w2 },
      scoreA: 6,
      scoreB: 3,
      isFinished: true,
      date: '2026-01-01',
    });

    const result = calculateDailyMvp([m1, m2, w1, w2], [match], '2026-01-01');
    expect(result.maleMvp).not.toBeNull();
    expect(result.femaleMvp).not.toBeNull();
    expect(result.maleMvp?.gender).toBe('MALE');
    expect(result.femaleMvp?.gender).toBe('FEMALE');
  });

  it('excludes guest players from MVP', () => {
    const guestM = makePlayer(GUEST_M_ID, 'Guest M', 'MALE');
    const match = makeMatch({
      teamA: { id: 'ta', man: guestM, woman: w1 },
      teamB: { id: 'tb', man: m2, woman: w2 },
      scoreA: 6,
      scoreB: 3,
      isFinished: true,
      date: '2026-01-01',
    });

    const result = calculateDailyMvp([guestM, m2, w1, w2], [match], '2026-01-01');
    // Guest should not be MVP even if they won
    if (result.maleMvp) {
      expect(result.maleMvp.id).not.toBe(GUEST_M_ID);
    }
  });

  it('excludes dynamic guest players from MVP', () => {
    const guestM1 = makePlayer('guest-male-1', '게스트(남)1', 'MALE');
    const match = makeMatch({
      teamA: { id: 'ta', man: guestM1, woman: w1 },
      teamB: { id: 'tb', man: m2, woman: w2 },
      scoreA: 6,
      scoreB: 3,
      isFinished: true,
      date: '2026-01-01',
    });

    const result = calculateDailyMvp([guestM1, m2, w1, w2], [match], '2026-01-01');
    if (result.maleMvp) {
      expect(result.maleMvp.id).not.toBe('guest-male-1');
    }
  });
});

// --- generateMixedDoublesSchedule ---

describe('generateMixedDoublesSchedule', () => {
  it('throws error when not enough players', () => {
    const men = [makePlayer('m1', 'M1', 'MALE')];
    const women = [makePlayer('w1', 'W1', 'FEMALE')];
    expect(() => generateMixedDoublesSchedule([...men, ...women], '2026-01-01')).toThrow();
  });

  it('generates matches with sufficient players', () => {
    const men = [makePlayer('m1', 'M1', 'MALE'), makePlayer('m2', 'M2', 'MALE')];
    const women = [makePlayer('w1', 'W1', 'FEMALE'), makePlayer('w2', 'W2', 'FEMALE')];
    const matches = generateMixedDoublesSchedule([...men, ...women], '2026-01-01');
    expect(matches.length).toBeGreaterThan(0);
    matches.forEach(m => {
      expect(m.date).toBe('2026-01-01');
      expect(m.isFinished).toBe(false);
    });
  });

  it('includes ALL players when men count is odd (3M + 3W)', () => {
    const men = [makePlayer('m1', 'M1', 'MALE'), makePlayer('m2', 'M2', 'MALE'), makePlayer('m3', 'M3', 'MALE')];
    const women = [makePlayer('w1', 'W1', 'FEMALE'), makePlayer('w2', 'W2', 'FEMALE'), makePlayer('w3', 'W3', 'FEMALE')];
    const allPlayers = [...men, ...women];

    // Run multiple times to account for randomness
    for (let trial = 0; trial < 10; trial++) {
      const matches = generateMixedDoublesSchedule(allPlayers, '2026-01-01');
      const participatingPlayerIds = new Set<string>();
      matches.forEach(m => {
        participatingPlayerIds.add(m.teamA.man.id);
        participatingPlayerIds.add(m.teamA.woman.id);
        participatingPlayerIds.add(m.teamB.man.id);
        participatingPlayerIds.add(m.teamB.woman.id);
      });

      // Every player must participate in at least one match
      allPlayers.forEach(p => {
        expect(participatingPlayerIds.has(p.id)).toBe(true);
      });
    }
  });

  it('includes ALL players when men > women (5M + 3W)', () => {
    const men = Array.from({ length: 5 }, (_, i) => makePlayer(`m${i+1}`, `M${i+1}`, 'MALE'));
    const women = Array.from({ length: 3 }, (_, i) => makePlayer(`w${i+1}`, `W${i+1}`, 'FEMALE'));
    const allPlayers = [...men, ...women];

    for (let trial = 0; trial < 10; trial++) {
      const matches = generateMixedDoublesSchedule(allPlayers, '2026-01-01');
      const participatingPlayerIds = new Set<string>();
      matches.forEach(m => {
        participatingPlayerIds.add(m.teamA.man.id);
        participatingPlayerIds.add(m.teamA.woman.id);
        participatingPlayerIds.add(m.teamB.man.id);
        participatingPlayerIds.add(m.teamB.woman.id);
      });

      men.forEach(p => {
        expect(participatingPlayerIds.has(p.id)).toBe(true);
      });
    }
  });

  it('includes ALL players when women > men (3M + 5W)', () => {
    const men = Array.from({ length: 3 }, (_, i) => makePlayer(`m${i+1}`, `M${i+1}`, 'MALE'));
    const women = Array.from({ length: 5 }, (_, i) => makePlayer(`w${i+1}`, `W${i+1}`, 'FEMALE'));
    const allPlayers = [...men, ...women];

    for (let trial = 0; trial < 10; trial++) {
      const matches = generateMixedDoublesSchedule(allPlayers, '2026-01-01');
      const participatingPlayerIds = new Set<string>();
      matches.forEach(m => {
        participatingPlayerIds.add(m.teamA.man.id);
        participatingPlayerIds.add(m.teamA.woman.id);
        participatingPlayerIds.add(m.teamB.man.id);
        participatingPlayerIds.add(m.teamB.woman.id);
      });

      women.forEach(p => {
        expect(participatingPlayerIds.has(p.id)).toBe(true);
      });
    }
  });

  it('covers ALL possible man-woman pairings for 3M + 3W', () => {
    const men = [makePlayer('m1', 'M1', 'MALE'), makePlayer('m2', 'M2', 'MALE'), makePlayer('m3', 'M3', 'MALE')];
    const women = [makePlayer('w1', 'W1', 'FEMALE'), makePlayer('w2', 'W2', 'FEMALE'), makePlayer('w3', 'W3', 'FEMALE')];
    const allPlayers = [...men, ...women];

    // 가능한 모든 페어링: 3x3 = 9개
    const allPossiblePairings = new Set<string>();
    men.forEach(m => women.forEach(w => allPossiblePairings.add(`${m.id}:${w.id}`)));
    expect(allPossiblePairings.size).toBe(9);

    // 10회 시행에서 매번 모든 페어링이 커버되는지 확인
    for (let trial = 0; trial < 10; trial++) {
      const matches = generateMixedDoublesSchedule(allPlayers, '2026-01-01');
      const usedPairings = new Set<string>();
      matches.forEach(m => {
        usedPairings.add(`${m.teamA.man.id}:${m.teamA.woman.id}`);
        usedPairings.add(`${m.teamB.man.id}:${m.teamB.woman.id}`);
      });

      // 모든 9개 페어링이 존재해야 함
      allPossiblePairings.forEach(pairing => {
        expect(usedPairings.has(pairing)).toBe(true);
      });
    }
  });

  it('generates more matches for 3M + 3W to cover all pairings', () => {
    const men = [makePlayer('m1', 'M1', 'MALE'), makePlayer('m2', 'M2', 'MALE'), makePlayer('m3', 'M3', 'MALE')];
    const women = [makePlayer('w1', 'W1', 'FEMALE'), makePlayer('w2', 'W2', 'FEMALE'), makePlayer('w3', 'W3', 'FEMALE')];

    const matches = generateMixedDoublesSchedule([...men, ...women], '2026-01-01');
    // 이전: 3경기만 생성 (9개 페어링 중 6개만 커버)
    // 수정 후: 최소 5경기 (9개 페어링 커버에 필요한 최소 경기 수: ceil(9/2) = 5)
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it('does not generate duplicate matches', () => {
    const men = Array.from({ length: 4 }, (_, i) => makePlayer(`m${i+1}`, `M${i+1}`, 'MALE'));
    const women = Array.from({ length: 4 }, (_, i) => makePlayer(`w${i+1}`, `W${i+1}`, 'FEMALE'));

    for (let trial = 0; trial < 10; trial++) {
      const matches = generateMixedDoublesSchedule([...men, ...women], '2026-01-01');
      const matchKeys = matches.map(m => {
        const a = `${m.teamA.man.id}:${m.teamA.woman.id}`;
        const b = `${m.teamB.man.id}:${m.teamB.woman.id}`;
        return [a, b].sort().join('|');
      });
      const uniqueKeys = new Set(matchKeys);
      expect(uniqueKeys.size).toBe(matchKeys.length);
    }
  });

  it('each match has 4 unique players', () => {
    const men = Array.from({ length: 4 }, (_, i) => makePlayer(`m${i+1}`, `M${i+1}`, 'MALE'));
    const women = Array.from({ length: 3 }, (_, i) => makePlayer(`w${i+1}`, `W${i+1}`, 'FEMALE'));

    const matches = generateMixedDoublesSchedule([...men, ...women], '2026-01-01');
    matches.forEach(m => {
      const playerIds = [m.teamA.man.id, m.teamA.woman.id, m.teamB.man.id, m.teamB.woman.id];
      // Men must be different across teams
      expect(m.teamA.man.id).not.toBe(m.teamB.man.id);
      // Women must be different across teams
      expect(m.teamA.woman.id).not.toBe(m.teamB.woman.id);
    });
  });
});

// --- generateDoubles ---

describe('generateDoubles', () => {
  it('throws error when fewer than 4 players', () => {
    const players = [
      makePlayer('p1', 'P1', 'MALE'),
      makePlayer('p2', 'P2', 'MALE'),
      makePlayer('p3', 'P3', 'FEMALE'),
    ];
    expect(() => generateDoubles(players, '2026-01-01')).toThrow('최소 4명');
  });

  it('generates correct number of matches', () => {
    const players = [
      makePlayer('p1', 'P1', 'MALE'),
      makePlayer('p2', 'P2', 'MALE'),
      makePlayer('p3', 'P3', 'FEMALE'),
      makePlayer('p4', 'P4', 'FEMALE'),
    ];
    const matches = generateDoubles(players, '2026-01-01');
    expect(matches.length).toBe(1); // 4 players = 1 match
  });

  it('generates multiple matches with 8 players', () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      makePlayer(`p${i}`, `P${i}`, i < 4 ? 'MALE' : 'FEMALE')
    );
    const matches = generateDoubles(players, '2026-01-01');
    expect(matches.length).toBe(2); // 8 players = 2 matches
  });
});

// --- generateSingles ---

describe('generateSingles', () => {
  it('throws error when fewer than 2 players', () => {
    expect(() => generateSingles([makePlayer('p1', 'P1', 'MALE')], '2026-01-01')).toThrow('최소 2명');
  });

  it('sets man === woman for singles matches', () => {
    const players = [
      makePlayer('p1', 'P1', 'MALE'),
      makePlayer('p2', 'P2', 'FEMALE'),
    ];
    const matches = generateSingles(players, '2026-01-01');
    expect(matches.length).toBe(1);
    matches.forEach(m => {
      expect(m.teamA.man.id).toBe(m.teamA.woman.id);
      expect(m.teamB.man.id).toBe(m.teamB.woman.id);
    });
  });
});

// --- isGuestPlayer ---

describe('isGuestPlayer', () => {
  it('returns true for legacy guest IDs', () => {
    expect(isGuestPlayer(GUEST_M_ID)).toBe(true);
    expect(isGuestPlayer(GUEST_F_ID)).toBe(true);
  });

  it('returns true for dynamic guest IDs', () => {
    expect(isGuestPlayer('guest-male-1')).toBe(true);
    expect(isGuestPlayer('guest-male-2')).toBe(true);
    expect(isGuestPlayer('guest-female-1')).toBe(true);
    expect(isGuestPlayer('guest-female-3')).toBe(true);
  });

  it('returns false for regular player IDs', () => {
    expect(isGuestPlayer('abc123')).toBe(false);
    expect(isGuestPlayer('player-1')).toBe(false);
    expect(isGuestPlayer('')).toBe(false);
  });
});
