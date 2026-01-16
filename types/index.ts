export type Gender = 'MALE' | 'FEMALE';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  photo?: string;
  bonusPoints?: number; // 👈 보너스 점수 필드 추가!
}

export interface Team {
  id: string;
  man: Player;
  woman: Player;
}

export interface Match {
  id: string;
  date: string;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  isFinished: boolean;
}

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