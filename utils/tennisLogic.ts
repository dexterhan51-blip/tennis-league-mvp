import { Player, Match, PlayerStat } from '@/types';

export const GUEST_M_ID = 'guest-male';
export const GUEST_F_ID = 'guest-female';

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- 1. 매치 메이킹 (기존과 동일) ---
// (이전 코드들이 길어서 생략, 아까 드린 generateMixedDoublesSchedule 등 그대로 두시면 됩니다!)
// 혹시 필요하면 이전 답변의 코드를 그대로 쓰세요. 여기서는 calculateRanking만 바꿉니다.

// [스마트 셔플 등 매칭 함수들은 그대로 유지...]
// (코드 생략 - generateMixedDoublesSchedule, generateDoubles, generateSingles)
export const generateMixedDoublesSchedule = (players: Player[], date: string): Match[] => {
    // ... (이전과 동일)
    const men = players.filter(p => p.gender === 'MALE' || p.id === GUEST_M_ID);
    const women = players.filter(p => p.gender === 'FEMALE' || p.id === GUEST_F_ID);
    if (men.length < 2 || women.length < 2) throw new Error("혼복 리그는 남/녀 각각 2명 이상 필요합니다.");
    let matchPool: Match[] = [];
    const rotationCount = women.length;
    for (let r = 0; r < rotationCount; r++) {
      const pairs: { m: Player, w: Player }[] = [];
      for (let i = 0; i < men.length; i++) {
          const womanIndex = (i + r) % women.length;
          pairs.push({ m: men[i], w: women[womanIndex] });
      }
      for (let k = 0; k < pairs.length - 1; k += 2) {
          matchPool.push({
              id: generateId(), date: date,
              teamA: { id: generateId(), man: pairs[k].m, woman: pairs[k].w },
              teamB: { id: generateId(), man: pairs[k+1].m, woman: pairs[k+1].w },
              scoreA: 0, scoreB: 0, isFinished: false,
          });
      }
    }
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
export const calculateRanking = (players: Player[], matches: Match[]): PlayerStat[] => {
  const statsMap = new Map<string, PlayerStat>();

  players.forEach((p) => {
    if (p.id === GUEST_M_ID || p.id === GUEST_F_ID) return;
    
    // 기본 보너스 점수 로드
    const bonus = p.bonusPoints || 0;

    statsMap.set(p.id, {
      playerId: p.id, name: p.name, gender: p.gender,
      matchesPlayed: 0, wins: 0, losses: 0, 
      totalPoints: bonus, // 👈 여기서 보너스 점수 먹고 들어갑니다!
      winRate: 0, avgPoints: 0, dailyBonus: false,
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
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.winRate - a.winRate); // 총점 기준 정렬
};

// --- 3. 오늘의 MVP 계산기 (NEW) ---
export const calculateDailyMvp = (players: Player[], matches: Match[], date: string) => {
    const dailyStats = new Map<string, { wins: number, played: number, name: string, gender: string }>();

    // 해당 날짜 매치만 필터링
    const targetMatches = matches.filter(m => m.date === date && m.isFinished);

    targetMatches.forEach(m => {
        const processPlayer = (p: Player, isWin: boolean) => {
            if (p.id === GUEST_M_ID || p.id === GUEST_F_ID) return;
            if (!dailyStats.has(p.id)) dailyStats.set(p.id, { wins: 0, played: 0, name: p.name, gender: p.gender });
            const s = dailyStats.get(p.id)!;
            s.played++;
            if (isWin) s.wins++;
        };

        const winA = m.scoreA > m.scoreB;
        const winB = m.scoreB > m.scoreA;

        // 팀 A 처리
        const pA = m.teamA.man.id === m.teamA.woman.id ? [m.teamA.man] : [m.teamA.man, m.teamA.woman];
        pA.forEach(p => processPlayer(p, winA));

        // 팀 B 처리
        const pB = m.teamB.man.id === m.teamB.woman.id ? [m.teamB.man] : [m.teamB.man, m.teamB.woman];
        pB.forEach(p => processPlayer(p, winB));
    });

    // 승률 계산 및 정렬
    const results = Array.from(dailyStats.entries()).map(([id, s]) => ({
        id, ...s, winRate: s.played > 0 ? s.wins / s.played : 0
    }));

    const men = results.filter(r => r.gender === 'MALE').sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
    const women = results.filter(r => r.gender === 'FEMALE').sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

    return {
        maleMvp: men.length > 0 ? men[0] : null,
        femaleMvp: women.length > 0 ? women[0] : null
    };
};