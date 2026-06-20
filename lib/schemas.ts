import { z } from 'zod';

export const GenderSchema = z.enum(['MALE', 'FEMALE']);

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  gender: GenderSchema,
  photo: z.string().optional(),
  bonusPoints: z.number().optional(),
});

export const TeamSchema = z.object({
  id: z.string(),
  man: PlayerSchema,
  woman: PlayerSchema,
});

export const PointLogEntrySchema = z.object({
  t: z.number(),
  winner: z.enum(['A', 'B']),
  scoreA: z.number(),
  scoreB: z.number(),
  serverId: z.string().optional(),
});

export const MatchSchema = z.object({
  id: z.string(),
  date: z.string(),
  teamA: TeamSchema,
  teamB: TeamSchema,
  scoreA: z.number(),
  scoreB: z.number(),
  isFinished: z.boolean(),
  isExhibition: z.boolean().optional(),
  videoUrl: z.string().optional(),
  scoringRule: z.enum(['no-ad', 'deuce']).optional(),
  serveOrder: z.array(z.string()).optional(),
  pointLog: z.array(PointLogEntrySchema).optional(),
});

export const ScoringConfigSchema = z.object({
  rule: z.enum(['no-ad', 'deuce']),
  winPoints: z.number().int().min(1).max(10),
});

export const LeagueDataSchema = z.object({
  name: z.string(),
  players: z.array(PlayerSchema),
  matches: z.array(MatchSchema),
  seasonEnd: z.string().optional(),
  createdAt: z.string(),
  savedAt: z.string().optional(),
  endDate: z.string().optional(),
});

export const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  fontSize: z.enum(['normal', 'large', 'xlarge']),
});

export const PlayerStatSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  gender: GenderSchema,
  matchesPlayed: z.number(),
  wins: z.number(),
  draws: z.number(),
  losses: z.number(),
  totalPoints: z.number(),
  winRate: z.number(),
  avgPoints: z.number(),
  dailyBonus: z.boolean(),
});

export const SeasonArchiveSchema = z.object({
  id: z.string(),
  leagueName: z.string(),
  slotIndex: z.number(),
  players: z.array(PlayerSchema),
  matches: z.array(MatchSchema),
  finalRankings: z.array(PlayerStatSchema),
  championPlayerId: z.string().optional(),
  seasonStart: z.string(),
  seasonEnd: z.string(),
  totalMatchDays: z.number(),
  totalMatches: z.number(),
});

export const SeasonRecordSchema = z.object({
  seasonId: z.string(),
  leagueName: z.string(),
  finalRank: z.number(),
  totalPoints: z.number(),
  wins: z.number(),
  losses: z.number(),
  draws: z.number(),
  matchesPlayed: z.number(),
  seasonEnd: z.string(),
});

export const PlayerCareerStatsSchema = z.object({
  playerId: z.string(),
  peakRank: z.number(),
  peakRankSeason: z.string().optional(),
  peakRankDate: z.string().optional(),
  championships: z.number(),
  seasonHistory: z.array(SeasonRecordSchema),
});

export const SeasonHistorySchema = z.array(SeasonArchiveSchema);
export const PlayerCareerStatsArraySchema = z.array(PlayerCareerStatsSchema);

export const ExportDataSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  players: z.array(PlayerSchema),
  leagues: z.array(LeagueDataSchema.nullable()),
  settings: AppSettingsSchema.optional(),
  seasonHistory: z.array(SeasonArchiveSchema).optional(),
  playerCareerStats: z.array(PlayerCareerStatsSchema).optional(),
});

export const PlayersArraySchema = z.array(PlayerSchema);

export const PreviousRankingsSchema = z.record(z.string(), z.number());

export const FinishedDatesSchema = z.array(z.string());

// ── 사주/MBTI 페르소나 (게임 세이브 코드의 seed) ──────────────────────────
// personaCode.PersonaInputs 와 1:1 미러. localStorage 저장값 검증용.
// mbti enum 은 personaCode.MBTI_TYPES 와 동일한 16종.
export const PersonaInputsSchema = z.object({
  schemaVersion: z.number().int().min(1).max(15),
  mbti: z.enum(['ESTJ','ESTP','ESFJ','ESFP','ENTJ','ENTP','ENFJ','ENFP','ISTJ','ISTP','ISFJ','ISFP','INTJ','INTP','INFJ','INFP']),
  gender: z.enum(['male','female']),
  calendarType: z.enum(['solar','lunar']),
  birthYear: z.number().int().min(1920).max(2100),
  birthMonth: z.number().int().min(1).max(12),
  birthDay: z.number().int().min(1).max(31),
  birthHour: z.number().int().min(0).max(23).nullable(),
});
export type StoredPersonaInputs = z.infer<typeof PersonaInputsSchema>;
