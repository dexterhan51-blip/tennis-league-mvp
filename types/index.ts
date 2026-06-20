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

/** 실시간 점수 입력 시 기록되는 포인트 단위 로그 (영상 편집/타임라인용) */
export interface PointLogEntry {
  t: number;          // 경기 시작 기준 상대 초
  winner: 'A' | 'B';  // 이 포인트를 가져간 팀
  pointA: number;     // 이 포인트 직후 현재 게임 포인트
  pointB: number;
  gameA: number;      // 이 포인트 직후 누적 게임 수 (매치 스코어)
  gameB: number;
  gameWon?: 'A' | 'B'; // 이 포인트로 게임을 따냈으면 그 팀
  serverId?: string;  // 이 포인트의 서버(선수 id)
}

export type ScoringRule = 'no-ad' | 'deuce';

export interface Match {
  id: string;
  date: string;
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  isFinished: boolean;
  isExhibition?: boolean;
  videoUrl?: string; // 운영자가 연결한 유튜브 경기 영상 (정규화된 watch URL)
  // ── 실시간 점수 입력(심판 모드) 기록 ──
  scoringRule?: ScoringRule;  // 이 경기에 적용된 듀스/노애드 규칙
  serveOrder?: string[];      // 서브 순서 (선수 id, 최대 4인)
  pointLog?: PointLogEntry[]; // 포인트 타임라인
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
  peakRank?: number;
  seasonPeakRank?: number;
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
  seasonHistory?: SeasonArchive[];
  playerCareerStats?: PlayerCareerStats[];
}

export interface LeagueData {
  name: string;
  players: Player[];
  matches: Match[];
  seasonEnd?: string;
  createdAt: string;
}

export interface SeasonArchive {
  id: string;
  leagueName: string;
  slotIndex: number;
  players: Player[];
  matches: Match[];
  finalRankings: PlayerStat[];
  championPlayerId?: string;
  seasonStart: string;
  seasonEnd: string;
  totalMatchDays: number;
  totalMatches: number;
}

export interface PlayerCareerStats {
  playerId: string;
  peakRank: number;
  peakRankSeason?: string;
  peakRankDate?: string;
  championships: number;
  seasonHistory: SeasonRecord[];
}

export interface SeasonRecord {
  seasonId: string;
  leagueName: string;
  finalRank: number;
  totalPoints: number;
  wins: number;
  losses: number;
  draws: number;
  matchesPlayed: number;
  seasonEnd: string;
}

export interface ScheduleConfig {
  maxMatches: number;
  players: Player[];
  date: string;
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