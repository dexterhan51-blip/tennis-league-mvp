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

export const ExportDataSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  players: z.array(PlayerSchema),
  leagues: z.array(LeagueDataSchema.nullable()),
  settings: AppSettingsSchema.optional(),
});

export const PlayersArraySchema = z.array(PlayerSchema);

export const PreviousRankingsSchema = z.record(z.string(), z.number());

export const FinishedDatesSchema = z.array(z.string());
