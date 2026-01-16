export type Gender = 'MALE' | 'FEMALE';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  photo?: string;
}

export interface Team {
  id: string;
  man: Player;
  woman: Player;
}

export interface Match {
  id: string;
  date: string; // 👈 날짜 추가됨!
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