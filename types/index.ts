export type Gender = 'MALE' | 'FEMALE';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  photo?: string;
  bonusPoints?: number; // 구 시즌 MVP 보너스 점수 (새 시즌부터는 부여하지 않음, 과거 데이터 호환용)
  mvpCount?: number;    // 이번 시즌 누적 MVP 횟수 (점수 미반영)
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
  /** 이번 시즌 누적 MVP 횟수 (점수에는 반영되지 않음) */
  mvpCount?: number;
}

/** 서버 friendly_matches 테이블 행 (리그 밖 친선경기) */
export interface FriendlyMatchRow {
  id: string;
  match_date: string; // 'YYYY-MM-DD'
  match: Match;
}

/** 투어 종합 랭킹에서 리그(대회) 하나가 기여한 몫 */
export interface TourLeagueBreakdown {
  leagueId: string;
  leagueName: string;
  points: number;
  wins: number;
  matchesPlayed: number;
}

/** 투어 종합 랭킹 엔트리 (리그별 점수 + 친선 점수 합산) */
export interface TourRankingEntry {
  playerId: string;
  name: string;
  gender: Gender;
  totalPoints: number;
  wins: number;
  draws: number;
  losses: number;
  matchesPlayed: number;
  winRate: number;
  perLeague: TourLeagueBreakdown[];
  friendlyPoints: number;
  friendlyWins: number;
  friendlyMatchesPlayed: number;
}

export interface PlayerWithRank extends PlayerStat {
  currentRank: number;
  previousRank?: number;
  rankChange: number;
  peakRank?: number;
  seasonPeakRank?: number;
  /** 아카이브된 전체 시즌 누적 포인트 기준 ATP식 통산 랭킹 (시즌 기록 없으면 undefined) */
  careerRank?: number;
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