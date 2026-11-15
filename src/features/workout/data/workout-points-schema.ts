import { z } from 'zod';

export const sessionIdSchema = z.uuid();
export const pointsRows = z.array(z.object({ id: z.string(), kind: z.enum(['workout', 'pr']),
  points: z.number().int().positive(), status: z.enum(['counted', 'pending', 'rejected']) }));
