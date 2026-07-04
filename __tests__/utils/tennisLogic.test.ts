import { Player, Match } from '@/types';
import {
  calculateRanking,
  calculateDailyMvp,
  generateMixedDoublesSchedule,
  generateFromTemplate,
  getTemplateKey,
  getSinglesTemplateKey,
  getTemplateCounts,
  isSinglesTemplate,
  generateDoubles,
  generateSingles,
  isGuestPlayer,
  recalculateMvpCounts,
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

  it('correctly distributes points for women-doubles match (stored as { man: w1, woman: w2 })', () => {
    // 여자복식: team.man 슬롯에 여1, team.woman 슬롯에 여2 저장 (gender 필드는 둘 다 FEMALE)
    const match = makeMatch({
      teamA: { id: 'ta', man: w1, woman: w2 },
      teamB: { id: 'tb', man: makePlayer('w3', 'W3', 'FEMALE'), woman: makePlayer('w4', 'W4', 'FEMALE') },
      scoreA: 6,
      scoreB: 3,
      isFinished: true,
    });
    const w3 = makePlayer('w3', 'W3', 'FEMALE');
    const w4 = makePlayer('w4', 'W4', 'FEMALE');

    const result = calculateRanking([w1, w2, w3, w4], [match]);

    // 승리 팀 (w1, w2): 출석 1 + 승점 1 = 2점
    expect(result.find(r => r.playerId === 'w1')!.totalPoints).toBe(2);
    expect(result.find(r => r.playerId === 'w1')!.wins).toBe(1);
    expect(result.find(r => r.playerId === 'w2')!.totalPoints).toBe(2);
    expect(result.find(r => r.playerId === 'w2')!.wins).toBe(1);

    // 패배 팀 (w3, w4): 출석 1점만
    expect(result.find(r => r.playerId === 'w3')!.totalPoints).toBe(1);
    expect(result.find(r => r.playerId === 'w3')!.losses).toBe(1);
    expect(result.find(r => r.playerId === 'w4')!.totalPoints).toBe(1);
    expect(result.find(r => r.playerId === 'w4')!.losses).toBe(1);
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

  it('women-doubles match contributes only to female MVP pool', () => {
    const w3 = makePlayer('w3', 'W3', 'FEMALE');
    const w4 = makePlayer('w4', 'W4', 'FEMALE');
    const match = makeMatch({
      teamA: { id: 'ta', man: w1, woman: w2 },
      teamB: { id: 'tb', man: w3, woman: w4 },
      scoreA: 6,
      scoreB: 3,
      isFinished: true,
      date: '2026-01-01',
    });

    const result = calculateDailyMvp([m1, m2, w1, w2, w3, w4], [match], '2026-01-01');
    // 남자 MVP는 없어야 함 (남자가 참여하지 않은 경기)
    expect(result.maleMvp).toBeNull();
    // 여자 MVP는 승리 팀의 여자 중 한 명
    expect(result.femaleMvp).not.toBeNull();
    expect(['w1', 'w2']).toContain(result.femaleMvp!.id);
    expect(result.femaleMvp!.gender).toBe('FEMALE');
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

// --- getTemplateKey ---

describe('getTemplateKey', () => {
  it('returns the matching key for the 5 supported scenarios', () => {
    expect(getTemplateKey(2, 3)).toBe('2-3');
    expect(getTemplateKey(3, 2)).toBe('3-2');
    expect(getTemplateKey(2, 4)).toBe('2-4');
    expect(getTemplateKey(3, 3)).toBe('3-3');
    expect(getTemplateKey(3, 4)).toBe('3-4');
  });

  it('returns null for unsupported combinations', () => {
    expect(getTemplateKey(2, 2)).toBeNull();
    expect(getTemplateKey(4, 4)).toBeNull();
    expect(getTemplateKey(5, 3)).toBeNull();
    expect(getTemplateKey(4, 3)).toBeNull();
    expect(getTemplateKey(0, 0)).toBeNull();
  });
});

// --- generateFromTemplate ---

describe('generateFromTemplate', () => {
  const buildMen = (n: number) =>
    Array.from({ length: n }, (_, i) => makePlayer(`m${i + 1}`, `M${i + 1}`, 'MALE'));
  const buildWomen = (n: number) =>
    Array.from({ length: n }, (_, i) => makePlayer(`w${i + 1}`, `W${i + 1}`, 'FEMALE'));

  // Helper: pair signature (gender-agnostic) for one team
  const pair = (team: Match['teamA']) => `${team.man.id}+${team.woman.id}`;

  it('generates exactly 6 sets for every supported template', () => {
    (['2-3', '3-2', '2-4', '3-3', '3-4'] as const).forEach(key => {
      const [m, w] = key.split('-').map(Number);
      const matches = generateFromTemplate(key, buildMen(m), buildWomen(w), '2026-01-01');
      expect(matches).toHaveLength(6);
      matches.forEach(match => {
        expect(match.date).toBe('2026-01-01');
        expect(match.isFinished).toBe(false);
        expect(match.scoreA).toBe(0);
        expect(match.scoreB).toBe(0);
      });
    });
  });

  it('produces the exact 2-3 schedule (M1 always team A, M2 always team B)', () => {
    const men = buildMen(2);
    const women = buildWomen(3);
    const matches = generateFromTemplate('2-3', men, women, '2026-01-01');
    const expected: Array<[string, string]> = [
      ['m1+w1', 'm2+w2'],
      ['m1+w2', 'm2+w3'],
      ['m1+w3', 'm2+w1'],
      ['m1+w2', 'm2+w1'],
      ['m1+w3', 'm2+w2'],
      ['m1+w1', 'm2+w3'],
    ];
    matches.forEach((match, i) => {
      expect(pair(match.teamA)).toBe(expected[i][0]);
      expect(pair(match.teamB)).toBe(expected[i][1]);
    });
  });

  it('produces the exact 3-2 schedule (W1 always team A, W2 always team B)', () => {
    const men = buildMen(3);
    const women = buildWomen(2);
    const matches = generateFromTemplate('3-2', men, women, '2026-01-01');
    // In 3-2 template, slots are (W, M) — man is stored in team.man, woman in team.woman
    const expected: Array<[string, string, string, string]> = [
      ['w1', 'm1', 'w2', 'm2'],
      ['w1', 'm2', 'w2', 'm3'],
      ['w1', 'm3', 'w2', 'm1'],
      ['w1', 'm2', 'w2', 'm1'],
      ['w1', 'm3', 'w2', 'm2'],
      ['w1', 'm1', 'w2', 'm3'],
    ];
    matches.forEach((match, i) => {
      const [aw, am, bw, bm] = expected[i];
      expect(match.teamA.woman.id).toBe(aw);
      expect(match.teamA.man.id).toBe(am);
      expect(match.teamB.woman.id).toBe(bw);
      expect(match.teamB.man.id).toBe(bm);
    });
  });

  it('2-4 template includes women doubles in sets 1 and 6', () => {
    const men = buildMen(2);
    const women = buildWomen(4);
    const matches = generateFromTemplate('2-4', men, women, '2026-01-01');

    // Set 1: 여1+여2 vs 여3+여4
    expect(matches[0].teamA.man.id).toBe('w1');
    expect(matches[0].teamA.woman.id).toBe('w2');
    expect(matches[0].teamB.man.id).toBe('w3');
    expect(matches[0].teamB.woman.id).toBe('w4');
    // 모두 여자
    expect(matches[0].teamA.man.gender).toBe('FEMALE');
    expect(matches[0].teamA.woman.gender).toBe('FEMALE');

    // Set 6: 여1+여3 vs 여2+여4
    expect(matches[5].teamA.man.id).toBe('w1');
    expect(matches[5].teamA.woman.id).toBe('w3');
    expect(matches[5].teamB.man.id).toBe('w2');
    expect(matches[5].teamB.woman.id).toBe('w4');

    // 중간 4세트는 혼복
    [1, 2, 3, 4].forEach(idx => {
      expect(matches[idx].teamA.man.gender).toBe('MALE');
      expect(matches[idx].teamA.woman.gender).toBe('FEMALE');
      expect(matches[idx].teamB.man.gender).toBe('MALE');
      expect(matches[idx].teamB.woman.gender).toBe('FEMALE');
    });
  });

  it('respects the order of input players (selection order → slot)', () => {
    // M1 슬롯에 두 번째 선수, M2 슬롯에 첫 번째 선수 배정
    const customMen = [
      makePlayer('alpha', 'Alpha', 'MALE'),
      makePlayer('beta', 'Beta', 'MALE'),
    ];
    const customWomen = [
      makePlayer('x', 'X', 'FEMALE'),
      makePlayer('y', 'Y', 'FEMALE'),
      makePlayer('z', 'Z', 'FEMALE'),
    ];
    const matches = generateFromTemplate('2-3', customMen, customWomen, '2026-01-01');
    // 1세트: M1+W1 vs M2+W2 → alpha+x vs beta+y
    expect(matches[0].teamA.man.id).toBe('alpha');
    expect(matches[0].teamA.woman.id).toBe('x');
    expect(matches[0].teamB.man.id).toBe('beta');
    expect(matches[0].teamB.woman.id).toBe('y');
  });

  it('throws when player counts do not match the template', () => {
    expect(() =>
      generateFromTemplate('2-3', buildMen(1), buildWomen(3), '2026-01-01'),
    ).toThrow();
    expect(() =>
      generateFromTemplate('3-4', buildMen(3), buildWomen(2), '2026-01-01'),
    ).toThrow();
  });

  it('3-3 template covers all 9 unique pairings', () => {
    const men = buildMen(3);
    const women = buildWomen(3);
    const matches = generateFromTemplate('3-3', men, women, '2026-01-01');

    const allPairings = new Set<string>();
    men.forEach(m => women.forEach(w => allPairings.add(`${m.id}:${w.id}`)));

    const used = new Set<string>();
    matches.forEach(m => {
      used.add(`${m.teamA.man.id}:${m.teamA.woman.id}`);
      used.add(`${m.teamB.man.id}:${m.teamB.woman.id}`);
    });
    allPairings.forEach(p => expect(used.has(p)).toBe(true));
  });

  it('3-4 template covers all 12 unique pairings', () => {
    const men = buildMen(3);
    const women = buildWomen(4);
    const matches = generateFromTemplate('3-4', men, women, '2026-01-01');

    const allPairings = new Set<string>();
    men.forEach(m => women.forEach(w => allPairings.add(`${m.id}:${w.id}`)));
    expect(allPairings.size).toBe(12);

    const used = new Set<string>();
    matches.forEach(m => {
      used.add(`${m.teamA.man.id}:${m.teamA.woman.id}`);
      used.add(`${m.teamB.man.id}:${m.teamB.woman.id}`);
    });
    allPairings.forEach(p => expect(used.has(p)).toBe(true));
  });

  it('all 5 templates are deterministic (same input → same output pairings)', () => {
    (['2-3', '3-2', '2-4', '3-3', '3-4'] as const).forEach(key => {
      const [m, w] = key.split('-').map(Number);
      const men = buildMen(m);
      const women = buildWomen(w);
      const r1 = generateFromTemplate(key, men, women, '2026-01-01');
      const r2 = generateFromTemplate(key, men, women, '2026-01-01');
      r1.forEach((match, i) => {
        expect(pair(match.teamA)).toBe(pair(r2[i].teamA));
        expect(pair(match.teamB)).toBe(pair(r2[i].teamB));
      });
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

// --- 단식 포함 템플릿 (S2-3, S3-2) ---

describe('generateFromTemplate (singles-included)', () => {
  const buildMen = (n: number) =>
    Array.from({ length: n }, (_, i) => makePlayer(`m${i + 1}`, `M${i + 1}`, 'MALE'));
  const buildWomen = (n: number) =>
    Array.from({ length: n }, (_, i) => makePlayer(`w${i + 1}`, `W${i + 1}`, 'FEMALE'));

  const isSinglesMatch = (m: Match) =>
    m.teamA.man.id === m.teamA.woman.id && m.teamB.man.id === m.teamB.woman.id;

  it('getSinglesTemplateKey maps only 2/3 and 3/2 compositions', () => {
    expect(getSinglesTemplateKey(2, 3)).toBe('S2-3');
    expect(getSinglesTemplateKey(3, 2)).toBe('S3-2');
    expect(getSinglesTemplateKey(2, 2)).toBeNull();
    expect(getSinglesTemplateKey(3, 3)).toBeNull();
    expect(getSinglesTemplateKey(2, 4)).toBeNull();
  });

  it('getTemplateCounts parses singles-included keys', () => {
    expect(getTemplateCounts('S2-3')).toEqual({ men: 2, women: 3 });
    expect(getTemplateCounts('S3-2')).toEqual({ men: 3, women: 2 });
    expect(getTemplateCounts('3-4')).toEqual({ men: 3, women: 4 });
  });

  it('isSinglesTemplate distinguishes singles-included templates', () => {
    expect(isSinglesTemplate('S2-3')).toBe(true);
    expect(isSinglesTemplate('S3-2')).toBe(true);
    expect(isSinglesTemplate('2-3')).toBe(false);
  });

  it('S2-3 produces the exact 7-set schedule (singles 1,3,5,7 / doubles 2,4,6)', () => {
    const matches = generateFromTemplate('S2-3', buildMen(2), buildWomen(3), '2026-01-01');
    expect(matches).toHaveLength(7);

    // 1세트(단식) 여1 vs 여2
    expect(isSinglesMatch(matches[0])).toBe(true);
    expect(matches[0].teamA.man.id).toBe('w1');
    expect(matches[0].teamB.man.id).toBe('w2');
    // 2세트(복식) 남1+여2 vs 남2+여3
    expect(matches[1].teamA.man.id).toBe('m1');
    expect(matches[1].teamA.woman.id).toBe('w2');
    expect(matches[1].teamB.man.id).toBe('m2');
    expect(matches[1].teamB.woman.id).toBe('w3');
    // 3세트(단식) 여1 vs 여3
    expect(isSinglesMatch(matches[2])).toBe(true);
    expect(matches[2].teamA.man.id).toBe('w1');
    expect(matches[2].teamB.man.id).toBe('w3');
    // 4세트(복식) 남1+여1 vs 남2+여2
    expect(matches[3].teamA.man.id).toBe('m1');
    expect(matches[3].teamA.woman.id).toBe('w1');
    expect(matches[3].teamB.man.id).toBe('m2');
    expect(matches[3].teamB.woman.id).toBe('w2');
    // 5세트(단식) 여2 vs 여3
    expect(isSinglesMatch(matches[4])).toBe(true);
    expect(matches[4].teamA.man.id).toBe('w2');
    expect(matches[4].teamB.man.id).toBe('w3');
    // 6세트(복식) 남1+여3 vs 남2+여1
    expect(matches[5].teamA.man.id).toBe('m1');
    expect(matches[5].teamA.woman.id).toBe('w3');
    expect(matches[5].teamB.man.id).toBe('m2');
    expect(matches[5].teamB.woman.id).toBe('w1');
    // 7세트(단식) 남1 vs 남2
    expect(isSinglesMatch(matches[6])).toBe(true);
    expect(matches[6].teamA.man.id).toBe('m1');
    expect(matches[6].teamB.man.id).toBe('m2');
  });

  it('S3-2 produces the exact 7-set schedule (singles 1,3,5,7 / doubles 2,4,6)', () => {
    const matches = generateFromTemplate('S3-2', buildMen(3), buildWomen(2), '2026-01-01');
    expect(matches).toHaveLength(7);

    // 1세트(단식) 남1 vs 남2
    expect(isSinglesMatch(matches[0])).toBe(true);
    expect(matches[0].teamA.man.id).toBe('m1');
    expect(matches[0].teamB.man.id).toBe('m2');
    // 2세트(복식) 남2+여1 vs 남3+여2
    expect(matches[1].teamA.man.id).toBe('m2');
    expect(matches[1].teamA.woman.id).toBe('w1');
    expect(matches[1].teamB.man.id).toBe('m3');
    expect(matches[1].teamB.woman.id).toBe('w2');
    // 3세트(단식) 남1 vs 남3
    expect(isSinglesMatch(matches[2])).toBe(true);
    expect(matches[2].teamA.man.id).toBe('m1');
    expect(matches[2].teamB.man.id).toBe('m3');
    // 4세트(복식) 남1+여1 vs 남2+여2
    expect(matches[3].teamA.man.id).toBe('m1');
    expect(matches[3].teamA.woman.id).toBe('w1');
    expect(matches[3].teamB.man.id).toBe('m2');
    expect(matches[3].teamB.woman.id).toBe('w2');
    // 5세트(단식) 남2 vs 남3
    expect(isSinglesMatch(matches[4])).toBe(true);
    expect(matches[4].teamA.man.id).toBe('m2');
    expect(matches[4].teamB.man.id).toBe('m3');
    // 6세트(복식) 남3+여1 vs 남1+여2
    expect(matches[5].teamA.man.id).toBe('m3');
    expect(matches[5].teamA.woman.id).toBe('w1');
    expect(matches[5].teamB.man.id).toBe('m1');
    expect(matches[5].teamB.woman.id).toBe('w2');
    // 7세트(단식) 여1 vs 여2
    expect(isSinglesMatch(matches[6])).toBe(true);
    expect(matches[6].teamA.man.id).toBe('w1');
    expect(matches[6].teamB.man.id).toBe('w2');
  });

  it('every player plays the same number of sets in singles-included templates', () => {
    (['S2-3', 'S3-2'] as const).forEach(key => {
      const { men: m, women: w } = getTemplateCounts(key);
      const matches = generateFromTemplate(key, buildMen(m), buildWomen(w), '2026-01-01');
      const playCount = new Map<string, number>();
      matches.forEach(match => {
        const ids = new Set([
          match.teamA.man.id, match.teamA.woman.id,
          match.teamB.man.id, match.teamB.woman.id,
        ]);
        ids.forEach(id => playCount.set(id, (playCount.get(id) || 0) + 1));
      });
      // 남2/여3(또는 남3/여2) 모두 인당 정확히 4.4세트는 아니지만 출전 수 편차 확인
      const counts = [...playCount.values()];
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    });
  });

  it('singles-included templates are deterministic and throw on wrong counts', () => {
    const r1 = generateFromTemplate('S2-3', buildMen(2), buildWomen(3), '2026-01-01');
    const r2 = generateFromTemplate('S2-3', buildMen(2), buildWomen(3), '2026-01-01');
    r1.forEach((match, i) => {
      expect(`${match.teamA.man.id}+${match.teamA.woman.id}`).toBe(`${r2[i].teamA.man.id}+${r2[i].teamA.woman.id}`);
      expect(`${match.teamB.man.id}+${match.teamB.woman.id}`).toBe(`${r2[i].teamB.man.id}+${r2[i].teamB.woman.id}`);
    });

    expect(() => generateFromTemplate('S2-3', buildMen(1), buildWomen(3), '2026-01-01')).toThrow();
    expect(() => generateFromTemplate('S3-2', buildMen(3), buildWomen(1), '2026-01-01')).toThrow();
  });
});

// --- recalculateMvpCounts ---

describe('recalculateMvpCounts', () => {
  const m1 = makePlayer('m1', 'M1', 'MALE');
  const m2 = makePlayer('m2', 'M2', 'MALE');
  const w1 = makePlayer('w1', 'W1', 'FEMALE');
  const w2 = makePlayer('w2', 'W2', 'FEMALE');

  const winMatch = (id: string, date: string): Match => makeMatch({
    id,
    date,
    teamA: { id: `ta-${id}`, man: m1, woman: w1 },
    teamB: { id: `tb-${id}`, man: m2, woman: w2 },
    scoreA: 6,
    scoreB: 3,
    isFinished: true,
  });

  it('완료된 날짜별 MVP를 mvpCount로 누적한다', () => {
    const matches = [winMatch('d1', '2026-07-01'), winMatch('d2', '2026-07-02')];
    const { updatedPlayers, mvpLog } = recalculateMvpCounts(
      [m1, m2, w1, w2],
      matches,
      ['2026-07-01', '2026-07-02']
    );

    const p1 = updatedPlayers.find(p => p.id === 'm1');
    const p2 = updatedPlayers.find(p => p.id === 'm2');
    expect(p1?.mvpCount).toBe(2);
    expect(p2?.mvpCount).toBe(0);
    expect(mvpLog).toHaveLength(2);
  });

  it('보너스 점수는 변경하지 않는다', () => {
    const withBonus = makePlayer('m1', 'M1', 'MALE', 4);
    const matches = [winMatch('d1', '2026-07-01')];
    const { updatedPlayers } = recalculateMvpCounts(
      [withBonus, m2, w1, w2],
      matches,
      ['2026-07-01']
    );

    expect(updatedPlayers.find(p => p.id === 'm1')?.bonusPoints).toBe(4);
  });
});
