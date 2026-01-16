import { Player, Team, Match, PlayerStat, Gender } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// 게스트 ID 상수
export const GUEST_M_ID = 'guest-male';
export const GUEST_F_ID = 'guest-female';

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
  const count = Math.min(men.length, women.length); // 짝이 맞는 수만큼만 생성

  // 2팀씩 묶어서 매치 생성 (A남/A여 vs B남/B여)
  for (let i = 0; i < count - 1; i += 2) {
    matches.push({
      id: uuidv4(),
      teamA: { id: uuidv4(), man: shuffledMen[i], woman: shuffledWomen[i] },
      teamB: { id: uuidv4(), man: shuffledMen[i+1], woman: shuffledWomen[i+1] },
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
      id: uuidv4(),
      teamA: { id: uuidv4(), man: shuffled[i], woman: shuffled[i+1] }, // 편의상 man/woman 필드에 넣음
      teamB: { id: uuidv4(), man: shuffled[i+2], woman: shuffled[i+3] },
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
    // 단식은 woman 자리에 null을 넣거나, man에만 데이터를 넣어서 처리
    // 여기서는 UI 호환성을 위해 woman 자리에 본인을 넣어둠 (표시할 때 주의)
    matches.push({
      id: uuidv4(),
      teamA: { id: uuidv4(), man: shuffled[i], woman: shuffled[i] }, 
      teamB: { id: uuidv4(), man: shuffled[i+1], woman: shuffled[i+1] },
      scoreA: 0, scoreB: 0, isFinished: false,
    });
  }
  return matches;
};


// --- 2. 랭킹 계산 (게스트 제외) ---
export const calculateRanking = (players: Player[], matches: Match[]): PlayerStat[] => {
  const statsMap = new Map<string, PlayerStat>();

  // 초기화 (게스트는 랭킹 맵에 아예 안 넣음 -> 계산 후에도 없음)
  players.forEach((p) => {
    if (p.id === GUEST_M_ID || p.id === GUEST_F_ID) return; // 게스트는 랭킹 제외
    
    statsMap.set(p.id, {
      playerId: p.id,
      name: p.name,
      gender: p.gender,
      matchesPlayed: 0, wins: 0, losses: 0, totalPoints: 0, winRate: 0, avgPoints: 0, dailyBonus: false,
    });
  });

  matches.forEach((m) => {
    if (!m.isFinished) return;
    
    // 승자/패자 팀 구분
    const isADraw = m.scoreA === m.scoreB;
    const winnerTeams = m.scoreA > m.scoreB ? [m.teamA] : (isADraw ? [] : [m.teamB]);
    const loserTeams = m.scoreA > m.scoreB ? [m.teamB] : (isADraw ? [] : [m.teamA]);

    // 승리팀 점수 부여
    winnerTeams.forEach((t) => {
        // man과 woman이 같으면(단식) 한 번만 처리
        const teamPlayers = t.man.id === t.woman.id ? [t.man] : [t.man, t.woman];
        teamPlayers.forEach((p) => {
            const s = statsMap.get(p.id);
            if (s) { s.matchesPlayed++; s.wins++; s.totalPoints += 2; } // 게스트면 s가 undefined라 패스됨
        });
    });

    // 패배팀 점수 부여
    loserTeams.forEach((t) => {
        const teamPlayers = t.man.id === t.woman.id ? [t.man] : [t.man, t.woman];
        teamPlayers.forEach((p) => {
            const s = statsMap.get(p.id);
            if (s) { s.matchesPlayed++; s.losses++; s.totalPoints += 1; }
        });
    });
  });

  // 통계 계산
  const stats = Array.from(statsMap.values()).map(s => {
    s.winRate = s.matchesPlayed > 0 ? (s.wins / s.matchesPlayed) * 100 : 0;
    s.avgPoints = s.matchesPlayed > 0 ? s.totalPoints / s.matchesPlayed : 0;
    return s;
  }).sort((a, b) => b.avgPoints - a.avgPoints || b.winRate - a.winRate);

  return stats;
};