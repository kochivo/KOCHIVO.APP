import { z } from 'zod';

export const leaderboard = z.array(z.object({
  player_id: z.uuid().nullable(), display_name: z.string(), lifetime: z.number().int().nonnegative(),
  tier: z.enum(['beginner', 'champion', 'elite', 'legend']), monthly: z.number().int().nonnegative(),
  is_crown: z.boolean(), position: z.number().int().positive(),
  adherence: z.number().int().min(0).max(100), done: z.number().int().nonnegative(),
  planned: z.number().int().min(8),
}));
