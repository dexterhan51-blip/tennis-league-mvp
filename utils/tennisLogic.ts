import { Player, Match, PlayerStat } from '@/types';

export const GUEST_M_ID = 'guest-male';
export const GUEST_F_ID = 'guest-female';

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- 1. 스마트 매치 메이킹 (연속 게임 최소화) ---

// [혼복 풀리그] 파트너 교체 + 순서 최적화
export const generateMixedDoublesSchedule = (players: Player[], date: string): Match[] => {
  const men = players.filter(p => p.gender === 'MALE' || p.id === GUEST_M_ID);
  const women = players.filter(p => p.gender === 'FEMALE' || p.id === GUEST_F_ID);

  if (men.length < 2 || women.length < 2) throw new Error("혼복 리그는 남/녀 각각 2명 이상 필요합니다.");

  // 1단계: 가능한 모든 매치 조합 생성 (Pool)
  let matchPool: Match[] = [];
  
  // 라운드 로빈 방식으로 모든 파트너 조합 생성
  const rotationCount = women.length; // 여자가 한 칸씩 이동하며 파트너 변경
  
  for (let r = 0; r < rotationCount; r++) {
    // 이번 라운드의 커플 생성
    const pairs: { m: Player, w: Player }[] = [];
    for (let i = 0; i < men.length; i++) {
        const womanIndex = (i + r) % women.length;
        pairs.push({ m: men[i], w: women[womanIndex] });
    }

    // 커플끼리 매칭 (A vs B)
    for (let k = 0; k < pairs.length - 1; k += 2) {
        matchPool.push({
            id: generateId(),
            date: date,
            teamA: { id: generateId(), man: pairs[k].m, woman: pairs[k].w },
            teamB: { id: generateId(), man: pairs[k+1].m, woman: pairs[k+1].w },
            scoreA: 0, scoreB: 0, isFinished: false,
        });
    }
  }

  // 2단계: 스마트 셔플 (연속 경기 최소화 알고리즘)
  const scheduledMatches: Match[] = [];
  let remainingMatches = [...matchPool];

  while (remainingMatches.length > 0) {
    let candidates: Match[] = [];
    
    // 방금 전 경기가 있다면, 그 선수들이 포함되지 않은 경기를 찾음
    if (scheduledMatches.length > 0) {
        const lastMatch = scheduledMatches[scheduledMatches.length - 1];
        const lastPlayers = [
            lastMatch.teamA.man.id, lastMatch.teamA.woman.id,
            lastMatch.teamB.man.id, lastMatch.teamB.woman.id
        ];

        candidates = remainingMatches.filter(m => {
            const currentPlayers = [
                m.teamA.man.id, m.teamA.woman.id,
                m.teamB.man.id, m.teamB.woman.id
            ];
            // 교집합이 하나도 없는지 확인 (휴식 보장)
            return !currentPlayers.some(p => lastPlayers.includes(p));
        });
    }

    // 휴식 가능한 경기가 없다면(어쩔 수 없는 연속 게임), 남은 것 중 아무거나 선택
    if (candidates.length === 0) {
        candidates = remainingMatches;
    }

    // 후보군 중에서 랜덤 선택 (다양성 확보)
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selectedMatch = candidates[randomIndex];

    scheduledMatches.push(selectedMatch);
    
    // 선택된 경기는 대기열에서 제거
    remainingMatches = remainingMatches.filter(m => m.id !== selectedMatch.id);
  }

  return scheduledMatches;
};

// [복식 랜덤]
export const generateDoubles = (players: Player[], date: string): Match[] => {
  if (players.length < 4) throw new Error("복식은 최소 4명이 필요합니다.");
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];

  for (let i = 0; i < shuffled.length - 3; i += 4) {
    matches.push({
      id: generateId(),
      date: date,
      teamA: { id: generateId(), man: shuffled[i], woman: shuffled[i+1] },
      teamB: { id: generateId(), man: shuffled[i+2], woman: shuffled[i+3] },
      scoreA: 0, scoreB: 0, isFinished: false,
    });
  }
  return matches;
};

// [단식 랜덤]
export const generateSingles = (players: Player[], date: string): Match[] => {
  if (players.length < 2) throw new Error("단식은 최소 2명이 필요합니다.");
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    matches.push({
      id: generateId(),
      date: date,
      teamA: { id: generateId(), man: shuffled[i], woman: shuffled[i] }, 
      teamB: { id: generateId(), man: shuffled[i+1], woman: shuffled[i+1] },
      scoreA: 0, scoreB: 0, isFinished: false,
    });
  }
  return matches;
};


// --- 2. 랭킹 계산 ---
export const calculateRanking = (players: Player[], matches: Match[]): PlayerStat[] => {
  const statsMap = new Map<string, PlayerStat>();

  players.forEach((p) => {
    if (p.id === GUEST_M_ID || p.id === GUEST_F_ID) return;
    statsMap.set(p.id, {
      playerId: p.id, name: p.name, gender: p.gender,
      matchesPlayed: 0, wins: 0, losses: 0, totalPoints: 0, winRate: 0, avgPoints: 0, dailyBonus: false,
    });
  });

  matches.forEach((m) => {
    if (!m.isFinished) return;
    const isADraw = m.scoreA === m.scoreB;
    const winnerTeams = m.scoreA > m.scoreB ? [m.teamA] : (isADraw ? [] : [m.teamB]);
    const loserTeams = m.scoreA > m.scoreB ? [m.teamB] : (isADraw ? [] : [m.teamA]);

    winnerTeams.forEach((t) => {
        const teamPlayers = t.man.id === t.woman.id ? [t.man] : [t.man, t.woman];
        teamPlayers.forEach((p) => {
            const s = statsMap.get(p.id);
            if (s) { s.matchesPlayed++; s.wins++; s.totalPoints += 2; }
        });
    });

    loserTeams.forEach((t) => {
        const teamPlayers = t.man.id === t.woman.id ? [t.man] : [t.man, t.woman];
        teamPlayers.forEach((p) => {
            const s = statsMap.get(p.id);
            if (s) { s.matchesPlayed++; s.losses++; s.totalPoints += 1; }
        });
    });
  });

  return Array.from(statsMap.values()).map(s => {
    s.winRate = s.matchesPlayed > 0 ? (s.wins / s.matchesPlayed) * 100 : 0;
    s.avgPoints = s.matchesPlayed > 0 ? s.totalPoints / s.matchesPlayed : 0;
    return s;
  }).sort((a, b) => b.avgPoints - a.avgPoints || b.winRate - a.winRate);
};