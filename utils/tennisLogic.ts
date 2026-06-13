import { Player, Match, PlayerStat, ScheduleConfig } from '@/types';

export const GUEST_M_ID = 'guest-male';
export const GUEST_F_ID = 'guest-female';

export function isGuestPlayer(id: string): boolean {
  return id.startsWith('guest-');
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- 0. 고정 템플릿 기반 대진 ---

export type SlotKey = 'M1' | 'M2' | 'M3' | 'W1' | 'W2' | 'W3' | 'W4';
// 단식 세트는 같은 슬롯을 두 번 적는다 (a: ['W1','W1']) → man === woman 인 기존 단식 표현으로 변환됨
type TemplateSet = { a: [SlotKey, SlotKey]; b: [SlotKey, SlotKey] };
export type TemplateKey = '2-3' | '3-2' | '2-4' | '3-3' | '3-4' | 'S2-3' | 'S3-2';

export const TEMPLATES: Record<TemplateKey, TemplateSet[]> = {
  '2-3': [
    { a: ['M1', 'W1'], b: ['M2', 'W2'] },
    { a: ['M1', 'W2'], b: ['M2', 'W3'] },
    { a: ['M1', 'W3'], b: ['M2', 'W1'] },
    { a: ['M1', 'W2'], b: ['M2', 'W1'] },
    { a: ['M1', 'W3'], b: ['M2', 'W2'] },
    { a: ['M1', 'W1'], b: ['M2', 'W3'] },
  ],
  '3-2': [
    { a: ['W1', 'M1'], b: ['W2', 'M2'] },
    { a: ['W1', 'M2'], b: ['W2', 'M3'] },
    { a: ['W1', 'M3'], b: ['W2', 'M1'] },
    { a: ['W1', 'M2'], b: ['W2', 'M1'] },
    { a: ['W1', 'M3'], b: ['W2', 'M2'] },
    { a: ['W1', 'M1'], b: ['W2', 'M3'] },
  ],
  '2-4': [
    { a: ['W1', 'W2'], b: ['W3', 'W4'] },
    { a: ['M1', 'W3'], b: ['M2', 'W2'] },
    { a: ['M1', 'W1'], b: ['M2', 'W4'] },
    { a: ['M1', 'W4'], b: ['M2', 'W3'] },
    { a: ['M1', 'W2'], b: ['M2', 'W1'] },
    { a: ['W1', 'W3'], b: ['W2', 'W4'] },
  ],
  '3-3': [
    { a: ['M1', 'W1'], b: ['M2', 'W2'] },
    { a: ['M3', 'W3'], b: ['M1', 'W2'] },
    { a: ['M2', 'W1'], b: ['M3', 'W3'] },
    { a: ['M1', 'W2'], b: ['M2', 'W1'] },
    { a: ['M1', 'W3'], b: ['M3', 'W2'] },
    { a: ['M3', 'W1'], b: ['M2', 'W3'] },
  ],
  '3-4': [
    { a: ['M2', 'W1'], b: ['M1', 'W3'] },
    { a: ['M1', 'W4'], b: ['M3', 'W2'] },
    { a: ['M3', 'W1'], b: ['M2', 'W2'] },
    { a: ['M1', 'W1'], b: ['M2', 'W4'] },
    { a: ['M1', 'W2'], b: ['M3', 'W3'] },
    { a: ['M2', 'W3'], b: ['M3', 'W4'] },
  ],
  // 단식 포함 남2/여3: 단식 4세트 + 복식 3세트
  'S2-3': [
    { a: ['W1', 'W1'], b: ['W2', 'W2'] }, // 1세트(단식) 여1 vs 여2
    { a: ['M1', 'W2'], b: ['M2', 'W3'] }, // 2세트(복식) 남1+여2 vs 남2+여3
    { a: ['W1', 'W1'], b: ['W3', 'W3'] }, // 3세트(단식) 여1 vs 여3
    { a: ['M1', 'W1'], b: ['M2', 'W2'] }, // 4세트(복식) 남1+여1 vs 남2+여2
    { a: ['W2', 'W2'], b: ['W3', 'W3'] }, // 5세트(단식) 여2 vs 여3
    { a: ['M1', 'W3'], b: ['M2', 'W1'] }, // 6세트(복식) 남1+여3 vs 남2+여1
    { a: ['M1', 'M1'], b: ['M2', 'M2'] }, // 7세트(단식) 남1 vs 남2
  ],
  // 단식 포함 남3/여2: 단식 4세트 + 복식 3세트
  'S3-2': [
    { a: ['M1', 'M1'], b: ['M2', 'M2'] }, // 1세트(단식) 남1 vs 남2
    { a: ['M2', 'W1'], b: ['M3', 'W2'] }, // 2세트(복식) 남2+여1 vs 남3+여2
    { a: ['M1', 'M1'], b: ['M3', 'M3'] }, // 3세트(단식) 남1 vs 남3
    { a: ['M1', 'W1'], b: ['M2', 'W2'] }, // 4세트(복식) 남1+여1 vs 남2+여2
    { a: ['M2', 'M2'], b: ['M3', 'M3'] }, // 5세트(단식) 남2 vs 남3
    { a: ['M3', 'W1'], b: ['M1', 'W2'] }, // 6세트(복식) 남3+여1 vs 남1+여2
    { a: ['W1', 'W1'], b: ['W2', 'W2'] }, // 7세트(단식) 여1 vs 여2
  ],
};

export function getTemplateKey(menCount: number, womenCount: number): TemplateKey | null {
  const key = `${menCount}-${womenCount}` as TemplateKey;
  return key in TEMPLATES ? key : null;
}

export function getSinglesTemplateKey(menCount: number, womenCount: number): TemplateKey | null {
  const key = `S${menCount}-${womenCount}` as TemplateKey;
  return key in TEMPLATES ? key : null;
}

export function isSinglesTemplate(key: TemplateKey): boolean {
  return key.startsWith('S');
}

export function getTemplateCounts(key: TemplateKey): { men: number; women: number } {
  const [men, women] = key.replace(/^S/, '').split('-').map(Number);
  return { men, women };
}

function resolveSlot(slot: SlotKey, men: Player[], women: Player[]): Player {
  const idx = parseInt(slot.slice(1), 10) - 1;
  const pool = slot.startsWith('M') ? men : women;
  const player = pool[idx];
  if (!player) throw new Error(`슬롯 ${slot}에 배정된 선수가 없습니다.`);
  return player;
}

function buildTeam(
  s1: SlotKey,
  s2: SlotKey,
  men: Player[],
  women: Player[],
): { man: Player; woman: Player } {
  const p1 = resolveSlot(s1, men, women);
  const p2 = resolveSlot(s2, men, women);
  const p1Male = s1.startsWith('M');
  const p2Male = s2.startsWith('M');
  // 혼복: 남자를 man 슬롯, 여자를 woman 슬롯에 저장
  if (p1Male && !p2Male) return { man: p1, woman: p2 };
  if (!p1Male && p2Male) return { man: p2, woman: p1 };
  // 동성 페어(여복/남복): 슬롯 순서 그대로 저장
  return { man: p1, woman: p2 };
}

export function generateFromTemplate(
  templateKey: TemplateKey,
  men: Player[],
  women: Player[],
  date: string,
): Match[] {
  const template = TEMPLATES[templateKey];
  if (!template) throw new Error(`지원하지 않는 템플릿: ${templateKey}`);

  return template.map((set) => {
    const teamA = buildTeam(set.a[0], set.a[1], men, women);
    const teamB = buildTeam(set.b[0], set.b[1], men, women);
    return {
      id: generateId(),
      date,
      teamA: { id: generateId(), man: teamA.man, woman: teamA.woman },
      teamB: { id: generateId(), man: teamB.man, woman: teamB.woman },
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
    };
  });
}

// --- 1. 스마트 스케줄링 알고리즘 ---

/**
 * 시간 기반 스마트 스케줄링
 * - maxMatches 개수만큼 경기 생성
 * - 각 선수의 경기 수 균등 (최대 편차 1게임)
 * - 연속 경기 방지 (2연속 이상 방지)
 * - 연속 쉼 방지 (2연속 이상 방지)
 * - 파트너 다양성
 */
export function generateSmartSchedule(config: ScheduleConfig): Match[] {
  const { maxMatches, players, date } = config;
  const men = players.filter(p => p.gender === 'MALE');
  const women = players.filter(p => p.gender === 'FEMALE');

  if (men.length < 2 || women.length < 2) {
    throw new Error("혼복 리그는 남/녀 각각 2명 이상 필요합니다.");
  }

  const playerCount = players.length;
  const targetGamesPerPlayer = Math.round(maxMatches * 4 / playerCount);

  // 선수별 경기 수, 연속 쉼 횟수 추적
  const playCount = new Map<string, number>();
  const consecutiveRest = new Map<string, number>();
  const partneredWith = new Map<string, Set<string>>();

  players.forEach(p => {
    playCount.set(p.id, 0);
    consecutiveRest.set(p.id, 0);
    partneredWith.set(p.id, new Set());
  });

  const matches: Match[] = [];

  for (let matchIdx = 0; matchIdx < maxMatches; matchIdx++) {
    // 직전 경기 참여자 (연속 경기 방지)
    const lastPlayers = new Set<string>();
    if (matches.length > 0) {
      const last = matches[matches.length - 1];
      [last.teamA.man, last.teamA.woman, last.teamB.man, last.teamB.woman].forEach(p => lastPlayers.add(p.id));
    }

    // 선수 선택: 4명 (남2 + 여2)
    const selectedMen = selectPlayers(men, 2, playCount, consecutiveRest, lastPlayers, targetGamesPerPlayer);
    const selectedWomen = selectPlayers(women, 2, playCount, consecutiveRest, lastPlayers, targetGamesPerPlayer);

    if (selectedMen.length < 2 || selectedWomen.length < 2) break;

    // 파트너 다양성을 고려한 팀 구성
    const [teamA, teamB] = formTeams(selectedMen, selectedWomen, partneredWith);

    const match: Match = {
      id: generateId(),
      date,
      teamA: { id: generateId(), man: teamA.man, woman: teamA.woman },
      teamB: { id: generateId(), man: teamB.man, woman: teamB.woman },
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
    };
    matches.push(match);

    // 통계 업데이트
    const playedIds = [teamA.man.id, teamA.woman.id, teamB.man.id, teamB.woman.id];
    playedIds.forEach(id => {
      playCount.set(id, (playCount.get(id) || 0) + 1);
      consecutiveRest.set(id, 0);
    });

    // 쉬는 선수들의 연속 쉼 카운터 증가
    players.forEach(p => {
      if (!playedIds.includes(p.id)) {
        consecutiveRest.set(p.id, (consecutiveRest.get(p.id) || 0) + 1);
      }
    });

    // 파트너 이력 기록
    partneredWith.get(teamA.man.id)?.add(teamA.woman.id);
    partneredWith.get(teamA.woman.id)?.add(teamA.man.id);
    partneredWith.get(teamB.man.id)?.add(teamB.woman.id);
    partneredWith.get(teamB.woman.id)?.add(teamB.man.id);
  }

  return matches;
}

function selectPlayers(
  pool: Player[],
  count: number,
  playCount: Map<string, number>,
  consecutiveRest: Map<string, number>,
  lastPlayers: Set<string>,
  targetGames: number,
): Player[] {
  // 점수 기반 선수 선택
  const scored = pool.map(p => {
    let score = 0;

    // 연속 2회 이상 쉬고 있으면 최우선 (must-play)
    const restCount = consecutiveRest.get(p.id) || 0;
    if (restCount >= 2) score += 1000;

    // 경기 수가 적을수록 우선
    const played = playCount.get(p.id) || 0;
    score += (targetGames - played) * 10;

    // 직전 경기 참여자는 감점 (연속 경기 방지)
    if (lastPlayers.has(p.id)) score -= 50;

    // 약간의 랜덤성 추가
    score += Math.random() * 5;

    return { player: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.player);
}

function formTeams(
  men: Player[],
  women: Player[],
  partneredWith: Map<string, Set<string>>,
): [{ man: Player; woman: Player }, { man: Player; woman: Player }] {
  // 두 가지 조합을 비교: (M0+W0 vs M1+W1) vs (M0+W1 vs M1+W0)
  const combo1NewPairs = countNewPairs(men[0], women[0], men[1], women[1], partneredWith);
  const combo2NewPairs = countNewPairs(men[0], women[1], men[1], women[0], partneredWith);

  if (combo2NewPairs > combo1NewPairs) {
    return [
      { man: men[0], woman: women[1] },
      { man: men[1], woman: women[0] },
    ];
  }
  if (combo1NewPairs > combo2NewPairs) {
    return [
      { man: men[0], woman: women[0] },
      { man: men[1], woman: women[1] },
    ];
  }
  // 같으면 랜덤
  if (Math.random() > 0.5) {
    return [
      { man: men[0], woman: women[1] },
      { man: men[1], woman: women[0] },
    ];
  }
  return [
    { man: men[0], woman: women[0] },
    { man: men[1], woman: women[1] },
  ];
}

function countNewPairs(
  m0: Player, w0: Player, m1: Player, w1: Player,
  partneredWith: Map<string, Set<string>>,
): number {
  let count = 0;
  if (!partneredWith.get(m0.id)?.has(w0.id)) count++;
  if (!partneredWith.get(m1.id)?.has(w1.id)) count++;
  return count;
}

// --- 기존 풀리그 함수 (코트 시간 미입력 시 사용) ---

export const generateMixedDoublesSchedule = (players: Player[], date: string, maxMatches?: number): Match[] => {
  const men = players.filter(p => p.gender === 'MALE');
  const women = players.filter(p => p.gender === 'FEMALE');
  if (men.length < 2 || women.length < 2) throw new Error("혼복 리그는 남/녀 각각 2명 이상 필요합니다.");

  // maxMatches가 지정되면 스마트 스케줄링 사용
  if (maxMatches && maxMatches > 0) {
    return generateSmartSchedule({ maxMatches, players, date });
  }

  // 기존 풀리그 로직
  const shuffledMen = [...men].sort(() => Math.random() - 0.5);
  const shuffledWomen = [...women].sort(() => Math.random() - 0.5);

  const matchPool: Match[] = [];
  const rotationCount = Math.max(shuffledMen.length, shuffledWomen.length);
  const seenMatchKeys = new Set<string>();

  for (let r = 0; r < rotationCount; r++) {
    const pairs: { m: Player; w: Player }[] = [];
    for (let i = 0; i < shuffledMen.length; i++) {
      const womanIndex = (i + r) % shuffledWomen.length;
      pairs.push({ m: shuffledMen[i], w: shuffledWomen[womanIndex] });
    }

    if (pairs.length % 2 === 1) {
      for (let s = 0; s < pairs.length; s++) {
        const matchPairs = pairs.filter((_, i) => i !== s);
        for (let k = 0; k + 1 < matchPairs.length; k += 2) {
          const teamA = matchPairs[k];
          const teamB = matchPairs[k + 1];
          const keyA = `${teamA.m.id}:${teamA.w.id}`;
          const keyB = `${teamB.m.id}:${teamB.w.id}`;
          const matchKey = [keyA, keyB].sort().join('|');
          if (seenMatchKeys.has(matchKey)) continue;
          seenMatchKeys.add(matchKey);
          matchPool.push({
            id: generateId(), date,
            teamA: { id: generateId(), man: teamA.m, woman: teamA.w },
            teamB: { id: generateId(), man: teamB.m, woman: teamB.w },
            scoreA: 0, scoreB: 0, isFinished: false,
          });
        }
      }
    } else {
      for (let k = 0; k + 1 < pairs.length; k += 2) {
        const teamA = pairs[k];
        const teamB = pairs[k + 1];
        const keyA = `${teamA.m.id}:${teamA.w.id}`;
        const keyB = `${teamB.m.id}:${teamB.w.id}`;
        const matchKey = [keyA, keyB].sort().join('|');
        if (seenMatchKeys.has(matchKey)) continue;
        seenMatchKeys.add(matchKey);
        matchPool.push({
          id: generateId(), date,
          teamA: { id: generateId(), man: teamA.m, woman: teamA.w },
          teamB: { id: generateId(), man: teamB.m, woman: teamB.w },
          scoreA: 0, scoreB: 0, isFinished: false,
        });
      }
    }
  }

  // 스마트 스케줄링: 연속 경기에서 같은 선수가 겹치지 않도록 배치
  const scheduledMatches: Match[] = [];
  let remainingMatches = [...matchPool];
  while (remainingMatches.length > 0) {
    let candidates: Match[] = [];
    if (scheduledMatches.length > 0) {
      const lastMatch = scheduledMatches[scheduledMatches.length - 1];
      const lastPlayers = [lastMatch.teamA.man.id, lastMatch.teamA.woman.id, lastMatch.teamB.man.id, lastMatch.teamB.woman.id];
      candidates = remainingMatches.filter(m => {
        const currentPlayers = [m.teamA.man.id, m.teamA.woman.id, m.teamB.man.id, m.teamB.woman.id];
        return !currentPlayers.some(p => lastPlayers.includes(p));
      });
    }
    if (candidates.length === 0) candidates = remainingMatches;
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selectedMatch = candidates[randomIndex];
    scheduledMatches.push(selectedMatch);
    remainingMatches = remainingMatches.filter(m => m.id !== selectedMatch.id);
  }
  return scheduledMatches;
};

export const generateDoubles = (players: Player[], date: string): Match[] => {
  if (players.length < 4) throw new Error("복식은 최소 4명이 필요합니다.");
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];
  for (let i = 0; i < shuffled.length - 3; i += 4) {
    matches.push({ id: generateId(), date: date, teamA: { id: generateId(), man: shuffled[i], woman: shuffled[i+1] }, teamB: { id: generateId(), man: shuffled[i+2], woman: shuffled[i+3] }, scoreA: 0, scoreB: 0, isFinished: false });
  }
  return matches;
};

export const generateSingles = (players: Player[], date: string): Match[] => {
  if (players.length < 2) throw new Error("단식은 최소 2명이 필요합니다.");
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    matches.push({ id: generateId(), date: date, teamA: { id: generateId(), man: shuffled[i], woman: shuffled[i] }, teamB: { id: generateId(), man: shuffled[i+1], woman: shuffled[i+1] }, scoreA: 0, scoreB: 0, isFinished: false });
  }
  return matches;
};

// --- 2. 랭킹 계산 (보너스 점수 반영) ---
// 점수 체계: 참석 1점(하루 1회) + 승리 1점 / 패배 0점 / 무승부 0점 / MVP 보너스 2점
export const calculateRanking = (players: Player[], matches: Match[]): PlayerStat[] => {
  const statsMap = new Map<string, PlayerStat>();
  const attendanceDates = new Map<string, Set<string>>();

  players.forEach((p) => {
    if (isGuestPlayer(p.id)) return;

    const bonus = p.bonusPoints || 0;

    statsMap.set(p.id, {
      playerId: p.id, name: p.name, gender: p.gender,
      matchesPlayed: 0, wins: 0, draws: 0, losses: 0,
      totalPoints: bonus,
      winRate: 0, avgPoints: 0, dailyBonus: false,
    });
    attendanceDates.set(p.id, new Set());
  });

  const getTeamPlayers = (team: Match['teamA']) =>
    team.man.id === team.woman.id ? [team.man] : [team.man, team.woman];

  const rankedMatches = matches.filter(m => !m.isExhibition);

  rankedMatches.forEach((m) => {
    if (!m.isFinished) return;
    const isDraw = m.scoreA === m.scoreB;

    [...getTeamPlayers(m.teamA), ...getTeamPlayers(m.teamB)].forEach((p) => {
      const dates = attendanceDates.get(p.id);
      if (dates) dates.add(m.date);
    });

    if (isDraw) {
      [m.teamA, m.teamB].forEach((t) => {
        getTeamPlayers(t).forEach((p) => {
          const s = statsMap.get(p.id);
          if (s) { s.matchesPlayed++; s.draws++; }
        });
      });
    } else {
      const winnerTeam = m.scoreA > m.scoreB ? m.teamA : m.teamB;
      const loserTeam = m.scoreA > m.scoreB ? m.teamB : m.teamA;

      getTeamPlayers(winnerTeam).forEach((p) => {
        const s = statsMap.get(p.id);
        if (s) { s.matchesPlayed++; s.wins++; s.totalPoints += 1; }
      });

      getTeamPlayers(loserTeam).forEach((p) => {
        const s = statsMap.get(p.id);
        if (s) { s.matchesPlayed++; s.losses++; }
      });
    }
  });

  attendanceDates.forEach((dates, playerId) => {
    const s = statsMap.get(playerId);
    if (s) s.totalPoints += dates.size;
  });

  return Array.from(statsMap.values()).map(s => {
    s.winRate = s.matchesPlayed > 0 ? (s.wins / s.matchesPlayed) * 100 : 0;
    s.avgPoints = s.matchesPlayed > 0 ? s.totalPoints / s.matchesPlayed : 0;
    return s;
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.winRate - a.winRate);
};

// --- 3. 오늘의 MVP 계산기 ---
export const calculateDailyMvp = (players: Player[], matches: Match[], date: string) => {
    const dailyStats = new Map<string, { wins: number, played: number, scoreDiff: number, name: string, gender: string }>();

    const targetMatches = matches.filter(m => m.date === date && m.isFinished && !m.isExhibition);

    targetMatches.forEach(m => {
        const diffA = m.scoreA - m.scoreB; // 팀A 기준 득실차 (양수면 승리, 음수면 패배)

        const processPlayer = (p: Player, isWin: boolean, diff: number) => {
            if (isGuestPlayer(p.id)) return;
            if (!dailyStats.has(p.id)) dailyStats.set(p.id, { wins: 0, played: 0, scoreDiff: 0, name: p.name, gender: p.gender });
            const s = dailyStats.get(p.id)!;
            s.played++;
            if (isWin) s.wins++;
            s.scoreDiff += diff;
        };

        const winA = m.scoreA > m.scoreB;
        const winB = m.scoreB > m.scoreA;

        const pA = m.teamA.man.id === m.teamA.woman.id ? [m.teamA.man] : [m.teamA.man, m.teamA.woman];
        pA.forEach(p => processPlayer(p, winA, diffA));

        const pB = m.teamB.man.id === m.teamB.woman.id ? [m.teamB.man] : [m.teamB.man, m.teamB.woman];
        pB.forEach(p => processPlayer(p, winB, -diffA));
    });

    const results = Array.from(dailyStats.entries()).map(([id, s]) => ({
        id, ...s, winRate: s.played > 0 ? s.wins / s.played : 0
    }));

    // 정렬: 1순위 승률 → 2순위 승수 → 3순위 득실차
    const sortFn = (a: typeof results[0], b: typeof results[0]) =>
        b.winRate - a.winRate || b.wins - a.wins || b.scoreDiff - a.scoreDiff;

    const menResults = results.filter(r => r.gender === 'MALE').sort(sortFn);
    const womenResults = results.filter(r => r.gender === 'FEMALE').sort(sortFn);

    return {
        maleMvp: menResults.length > 0 ? menResults[0] : null,
        femaleMvp: womenResults.length > 0 ? womenResults[0] : null
    };
};

// --- 4. MVP 보너스 점수 재계산 (소급 적용) ---
// finishedDates의 모든 날짜에 대해 MVP를 다시 계산하여 bonusPoints를 재설정
export const recalculateMvpBonuses = (
    players: Player[],
    matches: Match[],
    finishedDates: string[]
): { updatedPlayers: Player[]; mvpLog: { date: string; male: string | null; female: string | null }[] } => {
    // 1. 모든 선수의 bonusPoints를 0으로 초기화
    const bonusMap = new Map<string, number>();
    players.forEach(p => bonusMap.set(p.id, 0));

    // 2. 각 완료된 날짜에 대해 MVP 재계산
    const mvpLog: { date: string; male: string | null; female: string | null }[] = [];

    const sortedDates = [...finishedDates].sort();
    sortedDates.forEach(date => {
        const result = calculateDailyMvp(players, matches, date);

        if (result.maleMvp) {
            const current = bonusMap.get(result.maleMvp.id) || 0;
            bonusMap.set(result.maleMvp.id, current + 2);
        }
        if (result.femaleMvp) {
            const current = bonusMap.get(result.femaleMvp.id) || 0;
            bonusMap.set(result.femaleMvp.id, current + 2);
        }

        mvpLog.push({
            date,
            male: result.maleMvp?.name || null,
            female: result.femaleMvp?.name || null,
        });
    });

    // 3. 선수 데이터에 반영
    const updatedPlayers = players.map(p => ({
        ...p,
        bonusPoints: bonusMap.get(p.id) || 0,
    }));

    return { updatedPlayers, mvpLog };
};
