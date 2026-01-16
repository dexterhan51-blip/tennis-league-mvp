import { Player, Match, PlayerStat } from '@/types';

export const GUEST_M_ID = 'guest-male';
export const GUEST_F_ID = 'guest-female';

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- 1. 매치 메이킹 (날짜 파라미터 추가됨) ---

// [혼복]
export const generateMixedDoubles = (players: Player[], date: string): Match[] => {
  const men = players.filter(p => p.gender === 'MALE' || p.id === GUEST_M_ID);
  const women = players.filter(p => p.gender === 'FEMALE' || p.id === GUEST_F_ID);

  if (men.length < 2 || women.length < 2) throw new Error("혼복은 남/녀 각각 2명 이상 필요합니다.");

  const shuffledMen = [...men].sort(() => Math.random() - 0.5);
  const shuffledWomen = [...women].sort(() => Math.random() - 0.5);
  
  const matches: Match[] = [];
  const count = Math.min(men.length, women.length);

  for (let i = 0; i < count - 1; i += 2) {
    matches.push({
      id: generateId(),
      date: date, // 👈 날짜 저장
      teamA: { id: generateId(), man: shuffledMen[i], woman: shuffledWomen[i] },
      teamB: { id: generateId(), man: shuffledMen[i+1], woman: shuffledWomen[i+1] },
      scoreA: 0, scoreB: 0, isFinished: false,
    });
  }
  return matches;
};

// [복식]
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

// [단식]
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

// --- 2. 랭킹 계산 (변화 없음, 로직 유지) ---
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