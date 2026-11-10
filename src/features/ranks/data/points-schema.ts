import { z } from 'zod';

export const points = z.object({
  lifetime: z.number().int().nonnegative(), tier: z.enum(['beginner', 'champion', 'elite', 'legend']),
  monthly: z.number().int().nonnegative(), month_position: z.number().int().positive().nullable(),
  adherence: z.number().int().min(0).max(100), done: z.number().int().nonnegative(),
  planned: z.number().int().min(8), crown_needs_workouts: z.number().int().min(0).max(4),
  crown_gap: z.number().int().nonnegative(), logs: z.array(z.object({
    id: z.uuid(), player_id: z.uuid(), captain_id: z.uuid(),
    kind: z.enum(['workout', 'pr', 'perfect_week', 'inbody', 'meal_check']), source_key: z.string(),
    points: z.number().int().positive(), status: z.enum(['counted', 'pending', 'rejected']),
    earned_on: z.string(), created_at: z.string(), reviewed_at: z.string().nullable(),
  })).max(10),
});
export type MyPoints = z.infer<typeof points>;
