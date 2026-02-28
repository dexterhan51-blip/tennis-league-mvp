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
  draws: number;
  losses: number;
  totalPoints: number;
  winRate: number;
  avgPoints: number;
  dailyBonus: boolean;
}

export interface PlayerWithRank extends PlayerStat {
  currentRank: number;
  previousRank?: number;
  rankChange: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'normal' | 'large' | 'xlarge';
}

export interface ExportData {
  version: string;
  exportedAt: string;
  players: Player[];
  leagues: (LeagueData | null)[];
  settings?: AppSettings;
}

export interface LeagueData {
  name: string;
  players: Player[];
  matches: Match[];
  seasonEnd?: string;
  createdAt: string;
}

export interface SharedLeague {
  id: string;
  name: string;
  pin_code: string;
  players: Player[];
  matches: Match[];
  season_end?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}