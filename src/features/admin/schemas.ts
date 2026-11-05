import { z } from 'zod';

export const activationSchema = z.object({
  captain_id: z.uuid(),
  tier: z.enum(['entry', 'champion', 'legend', 'empire']),
  months: z.number().int().min(1).max(12),
  payment_ref: z.string().trim().max(80).optional(),
});
export const suspensionSchema = z.object({
  user_id: z.uuid(), suspended: z.boolean(), reason: z.string().trim().min(3).max(200),
});
