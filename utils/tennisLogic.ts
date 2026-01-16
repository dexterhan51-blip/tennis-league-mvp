import { Player, Match, PlayerStat } from '@/types';

// 게스트 ID 상수
export const GUEST_M_ID = 'guest-male';
export const GUEST_F_ID = 'guest-female';

// 간단한 ID 생성기 (uuid 라이브러리 대신 사용)
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- 1. 매치 메이킹 (혼복/복식/단식) ---

// [혼복] 남녀 짝지어 섞기
export const generateMixedDoubles = (players: Player[]): Match[] => {
  const men = players.filter(p => p.gender === 'MALE' || p.id === GUEST_M_ID);
  const women = players.filter(p => p.gender === 'FEMALE' || p.id === GUEST_F_ID);

  if (men.length < 2 || women.length < 2) throw new Error("혼복은 남/녀 각각 2명 이상 필요합니다.");

  // 랜덤 셔플
  const shuffledMen = [...men].sort(() => Math.random() - 0.5);
  const shuffledWomen = [...women].sort(() => Math.random() - 0.5);
  
  const matches: Match[] = [];
  const count = Math.min(men.length, women.length);

  // 2팀씩 묶어서 매치 생성
  for (let i = 0; i < count - 1; i += 2) {
    matches.push({
      id: generateId(),
      teamA: { id: generateId(), man: shuffledMen[i], woman: shuffledWomen[i] },
      teamB: { id: generateId(), man: shuffledMen[i+1], woman: shuffledWomen[i+1] },
      scoreA: 0, scoreB: 0, isFinished: false,
    });
  }
  return matches;
};

// [복식] 성별 상관없이 2:2
export const generateDoubles = (players: Player[]): Match[] => {
  if (players.length < 4) throw new Error("복식은 최소 4명이 필요합니다.");
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];

  for (let i = 0; i < shuffled.length - 3; i += 4) {
    matches.push({
      id: generateId(),
      teamA: { id: generateId(), man: shuffled[i], woman: shuffled[i+1] },
      teamB: { id: generateId(), man: shuffled[i+2], woman: shuffled[i+3] },
      scoreA: 0, scoreB: 0, isFinished: false,
    });
  }
  return matches;
};

// [단식] 1:1
export const generateSingles = (players: Player[]): Match[] => {
  if (players.length < 2) throw new Error("단식은 최소 2명이 필요합니다.");
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const matches: Match[] = [];

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    matches.push({
      id: generateId(),
      teamA: { id: generateId(), man: shuffled[i], woman: shuffled[i] }, 
      teamB: { id: generateId(), man: shuffled[i+1], woman: shuffled[i+1] },
      scoreA: 0, scoreB: 0, isFinished: false,
    });
  }
  return matches;
};


// --- 2. 랭킹 계산 (게스트 제외) ---
export const calculateRanking = (players: Player[], matches: Match[]): PlayerStat[] => {
  const statsMap = new Map<string, PlayerStat>();

  // 1. 랭킹 맵 초기화
  players.forEach((p) => {
    if (p.id === GUEST_M_ID || p.id === GUEST_F_ID) return; // 게스트 제외
    
    statsMap.set(p.id, {
      playerId: p.id,
      name: p.name,
      gender: p.gender,
      matchesPlayed: 0, wins: 0, losses: 0, totalPoints: 0, winRate: 0, avgPoints: 0, dailyBonus: false,
    });
  });

  // 2. 경기 결과 반영
  matches.forEach((m) => {
    if (!m.isFinished) return;
    
    const isADraw = m.scoreA === m.scoreB;
    const winnerTeams = m.scoreA > m.scoreB ? [m.teamA] : (isADraw ? [] : [m.teamB]);
    const loserTeams = m.scoreA > m.scoreB ? [m.teamB] : (isADraw ? [] : [m.teamA]);

    // 승리팀 점수 (+2점)
    winnerTeams.forEach((t) => {
        const teamPlayers = t.man.id === t.woman.id ? [t.man] : [t.man, t.woman];
        teamPlayers.forEach((p) => {
            const s = statsMap.get(p.id);
            if (s) { s.matchesPlayed++; s.wins++; s.totalPoints += 2; }
        });
    });

    // 패배팀 점수 (+1점)
    loserTeams.forEach((t) => {
        const teamPlayers = t.man.id === t.woman.id ? [t.man] : [t.man, t.woman];
        teamPlayers.forEach((p) => {
            const s = statsMap.get(p.id);
            if (s) { s.matchesPlayed++; s.losses++; s.totalPoints += 1; }
        });
    });
  });

  // 3. 통계 정리 및 정렬
  const stats = Array.from(statsMap.values()).map(s => {
    s.winRate = s.matchesPlayed > 0 ? (s.wins / s.matchesPlayed) * 100 : 0;
    s.avgPoints = s.matchesPlayed > 0 ? s.totalPoints / s.matchesPlayed : 0;
    return s;
  }).sort((a, b) => b.avgPoints - a.avgPoints || b.winRate - a.winRate);

  return stats;
};