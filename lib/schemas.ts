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

export const MatchSchema = z.object({
  id: z.string(),
  date: z.string(),
  teamA: TeamSchema,
  teamB: TeamSchema,
  scoreA: z.number(),
  scoreB: z.number(),
  isFinished: z.boolean(),
  isExhibition: z.boolean().optional(),
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
