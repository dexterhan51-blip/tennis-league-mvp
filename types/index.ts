export type Gender = 'MALE' | 'FEMALE';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  photo?: string; // 사진 (선택사항)
}

export interface Team {
  id: string;
  man: Player;
  woman: Player;
}

export interface Match {
  id: string;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  isFinished: boolean;
}

// 👇 이 부분이 빠져서 빨간 줄이 떴던 겁니다!
export interface PlayerStat {
  playerId: string;
  name: string;
  gender: Gender;
  matchesPlayed: number;
  wins: number;
  losses: number;
  totalPoints: number;
  winRate: number;
  avgPoints: number;
  dailyBonus: boolean;
}