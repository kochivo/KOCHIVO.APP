import { z } from 'zod';

const base = { key: z.string(), player_id: z.string().uuid(), player_name: z.string(), data: z.record(z.string(), z.unknown()) };
const item = z.discriminatedUnion('severity', [
  z.object({ ...base, severity: z.literal('urgent'), kind: z.enum(['swap_requested', 'join_requested', 'expired', 'expiring', 'sessions_used_up', 'inactive', 'today_workout', 'my_expiring']) }),
  z.object({ ...base, severity: z.literal('generate'), kind: z.enum(['no_program', 'no_nutrition', 'log_meal']) }),
]);
export const feedItems = z.array(item).max(8);
export const digestEvents = z.array(z.object({ player_id: z.string(), source_key: z.string() }));
