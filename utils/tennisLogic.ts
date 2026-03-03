import { Player, Match, PlayerStat } from '@/types';

export const GUEST_M_ID = 'guest-male';
export const GUEST_F_ID = 'guest-female';

export function isGuestPlayer(id: string): boolean {
  return id.startsWith('guest-');
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- 1. 매치 메이킹 (기존과 동일) ---
// (이전 코드들이 길어서 생략, 아까 드린 generateMixedDoublesSchedule 등 그대로 두시면 됩니다!)
// 혹시 필요하면 이전 답변의 코드를 그대로 쓰세요. 여기서는 calculateRanking만 바꿉니다.

// [스마트 셔플 등 매칭 함수들은 그대로 유지...]
// (코드 생략 - generateMixedDoublesSchedule, generateDoubles, generateSingles)
export const generateMixedDoublesSchedule = (players: Player[], date: string): Match[] => {
    const men = players.filter(p => p.gender === 'MALE');
    const women = players.filter(p => p.gender === 'FEMALE');
    if (men.length < 2 || women.length < 2) throw new Error("혼복 리그는 남/녀 각각 2명 이상 필요합니다.");

    // 랜덤 셔플로 매번 다른 조합 생성
    const shuffledMen = [...men].sort(() => Math.random() - 0.5);
    const shuffledWomen = [...women].sort(() => Math.random() - 0.5);

    const matchPool: Match[] = [];
    // 더 많은 성별의 수만큼 로테이션하여 모든 선수에게 기회 보장
    const rotationCount = Math.max(shuffledMen.length, shuffledWomen.length);
    const seenMatchKeys = new Set<string>();

    for (let r = 0; r < rotationCount; r++) {
      // 남녀 페어 생성 (각 남자당 1명의 여자)
      const pairs: { m: Player; w: Player }[] = [];
      for (let i = 0; i < shuffledMen.length; i++) {
        const womanIndex = (i + r) % shuffledWomen.length;
        pairs.push({ m: shuffledMen[i], w: shuffledWomen[womanIndex] });
      }

      if (pairs.length % 2 === 1) {
        // 홀수 페어: 모든 가능한 skip 조합을 시도하여 더 많은 매치 생성
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
        // 짝수 페어: 모든 페어를 매치에 사용
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
  // 선수별 참석 날짜 추적 (하루 1점만 부여)
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

  // 시범경기 제외
  const rankedMatches = matches.filter(m => !m.isExhibition);

  rankedMatches.forEach((m) => {
    if (!m.isFinished) return;
    const isDraw = m.scoreA === m.scoreB;

    // 모든 참가 선수의 참석 날짜 기록
    [...getTeamPlayers(m.teamA), ...getTeamPlayers(m.teamB)].forEach((p) => {
      const dates = attendanceDates.get(p.id);
      if (dates) dates.add(m.date);
    });

    if (isDraw) {
      // 무승부: 승점 0
      [m.teamA, m.teamB].forEach((t) => {
        getTeamPlayers(t).forEach((p) => {
          const s = statsMap.get(p.id);
          if (s) { s.matchesPlayed++; s.draws++; }
        });
      });
    } else {
      const winnerTeam = m.scoreA > m.scoreB ? m.teamA : m.teamB;
      const loserTeam = m.scoreA > m.scoreB ? m.teamB : m.teamA;

      // 승리: 승점 1
      getTeamPlayers(winnerTeam).forEach((p) => {
        const s = statsMap.get(p.id);
        if (s) { s.matchesPlayed++; s.wins++; s.totalPoints += 1; }
      });

      // 패배: 승점 0
      getTeamPlayers(loserTeam).forEach((p) => {
        const s = statsMap.get(p.id);
        if (s) { s.matchesPlayed++; s.losses++; }
      });
    }
  });

  // 참석 점수 반영 (하루 1점)
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

// --- 3. 오늘의 MVP 계산기 (NEW) ---
export const calculateDailyMvp = (players: Player[], matches: Match[], date: string) => {
    const dailyStats = new Map<string, { wins: number, played: number, name: string, gender: string }>();

    // 해당 날짜 매치만 필터링 (시범경기 제외)
    const targetMatches = matches.filter(m => m.date === date && m.isFinished && !m.isExhibition);

    targetMatches.forEach(m => {
        const processPlayer = (p: Player, isWin: boolean) => {
            if (isGuestPlayer(p.id)) return;
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