import { z } from 'zod';

const foodSchema = z.object({ id: z.uuid(), name: z.string(), photo: z.string().nullable(),
  kcal: z.number().nonnegative(), protein: z.number().nonnegative(), carbs: z.number().nonnegative(), fat: z.number().nonnegative() });
const alternative = z.object({ id: z.uuid(), food: foodSchema, grams: z.number().positive().max(99999.9) });
export const draftSchema = z.object({
  id: z.uuid(), playerId: z.uuid().nullable(), title: z.string().trim().min(1).max(80),
  status: z.enum(['draft', 'active', 'archived']),
  waterTargetMl: z.number().int().min(500).max(10000).nullable().optional(),
  targets: z.object({ kcal: z.number().int().min(800).max(8000), protein: z.number().int().min(0).max(32767),
    carbs: z.number().int().min(0).max(32767), fat: z.number().int().min(0).max(32767) }),
  meals: z.array(z.object({ id: z.uuid(), name: z.string().trim().min(1).max(40), position: z.number().int().positive(), dayType: z.enum(['all', 'training', 'rest']).optional(),
    timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).nullable().optional(),
    ramadanSlot: z.enum(['iftar','post_workout','suhoor']).nullable().optional(),
    items: z.array(alternative.extend({ unit: z.string().min(1).max(80).nullable().optional(), grams: z.number().min(5).max(2000), position: z.number().int().positive(), alternatives: z.array(alternative).max(100) })).max(100),
  })).max(100),
});
