import { Player, Team, Match, PlayerStat, Gender } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// --- 매치 메이킹 로직 ---
export const generateMatches = (players: Player[]): Match[] => {
  const men = players.filter((p) => p.gender === 'MALE');
  const women = players.filter((p) => p.gender === 'FEMALE');

  if (men.length === 0 || women.length === 0) throw new Error("남녀 최소 1명씩 필요합니다.");

  const teams: Team[] = [];
  const maxCount = Math.max(men.length, women.length);
  
  // 랜덤 셔플
  const shuffledMen = [...men].sort(() => Math.random() - 0.5);
  const shuffledWomen = [...women].sort(() => Math.random() - 0.5);

  // 불균형 처리 (Loop)
  for (let i = 0; i < maxCount; i++) {
    teams.push({
      id: uuidv4(),
      man: shuffledMen[i % shuffledMen.length],
      woman: shuffledWomen[i % shuffledWomen.length],
    });
  }

  // 대진 생성
  const matches: Match[] = [];
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffledTeams.length - 1; i += 2) {
    matches.push({
      id: uuidv4(),
      teamA: shuffledTeams[i],
      teamB: shuffledTeams[i + 1],
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
    });
  }
  return matches;
};

// --- 랭킹 계산 로직 ---
export const calculateRanking = (players: Player[], matches: Match[]): PlayerStat[] => {
  const statsMap = new Map<string, PlayerStat>();

  players.forEach((p) => {
    statsMap.set(p.id, {
      playerId: p.id,
      name: p.name,
      gender: p.gender,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      totalPoints: 0,
      winRate: 0,
      avgPoints: 0,
      dailyBonus: false,
    });
  });

  matches.forEach((m) => {
    if (!m.isFinished) return;
    // const isADraw = m.scoreA === m.scoreB; 
    const winnerTeams = m.scoreA > m.scoreB ? [m.teamA] : [m.teamB];
    const loserTeams = m.scoreA > m.scoreB ? [m.teamB] : [m.teamA];

    winnerTeams.forEach((t) => [t.man, t.woman].forEach((p) => {
        const s = statsMap.get(p.id)!; s.matchesPlayed++; s.wins++; s.totalPoints += 2;
    }));
    loserTeams.forEach((t) => [t.man, t.woman].forEach((p) => {
        const s = statsMap.get(p.id)!; s.matchesPlayed++; s.losses++; s.totalPoints += 1;
    }));
  });

  const stats = Array.from(statsMap.values()).map(s => {
    s.winRate = s.matchesPlayed > 0 ? (s.wins / s.matchesPlayed) * 100 : 0;
    return s;
  });

  // 일일 보너스 (성별 승률 1위)
  const genders: Gender[] = ['MALE', 'FEMALE'];
  genders.forEach((g) => {
    const targets = stats.filter(s => s.gender === g && s.matchesPlayed > 0);
    const top = targets.sort((a, b) => b.winRate - a.winRate)[0];
    if (top) { top.totalPoints += 3; top.dailyBonus = true; }
  });

  return stats.map(s => {
    s.avgPoints = s.matchesPlayed > 0 ? s.totalPoints / s.matchesPlayed : 0;
    return s;
  }).sort((a, b) => b.avgPoints - a.avgPoints || b.winRate - a.winRate || b.totalPoints - a.totalPoints);
};