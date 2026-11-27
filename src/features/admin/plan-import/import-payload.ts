import { z } from 'zod';
import { workbookSourceSchema } from '@/features/plan-source';

const integer = (min: number, max: number) => z.number().int().min(min).max(max);
const text = (max: number) => z.string().trim().min(1).max(max);
const targets = z.object({ kcal: integer(800, 8000), protein: integer(0, 1000), carbs: integer(0, 2000), fat: integer(0, 1000) });
const food = z.object({
  name: text(60), amount: z.number().positive().max(5000), unit: z.enum(['g', 'ml', 'piece']),
  gramsPerUnit: z.number().min(0.1).max(1000), kcal: z.number().min(0).max(10000),
  protein: z.number().min(0).max(5000), carbs: z.number().min(0).max(5000), fat: z.number().min(0).max(5000),
}).refine(row => {
  const grams = row.amount * row.gramsPerUnit;
  return grams >= 5 && grams <= 2000 && row.kcal / grams * 100 < 99999
    && Math.max(row.protein, row.carbs, row.fat) / grams * 100 < 9999
    && (row.unit !== 'g' || row.gramsPerUnit === 1);
});
const exercise = z.object({
  name: text(100), sets: integer(1, 20), repsMin: integer(1, 100), repsMax: integer(1, 100).nullable(),
  rirs: z.array(integer(0, 5).nullable()).min(1).max(20), rest: integer(0, 900).multipleOf(15),
  muscle: z.string().max(60), note: z.string().max(200),
}).refine(row => row.rirs.length === row.sets && (row.repsMax === null || row.repsMax >= row.repsMin));
const warmupItem = z.object({ name: text(60), amount: integer(1, 999), note: z.string().max(80) });
const base = { id: z.uuidv7(), captainId: z.uuid(), title: text(80), source: workbookSourceSchema };
export const importPayload = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('nutrition'), targets: targets.nullable(), water: integer(500, 10000).nullable(),
    meals: z.array(z.object({ name: text(40), items: z.array(food).min(1).max(24) })).min(1).max(12) }),
  z.object({ ...base, kind: z.literal('training'), weeks: integer(1, 12),
    days: z.array(z.object({
      name: text(60), warmup: z.array(warmupItem).max(12), exercises: z.array(exercise).min(1).max(30),
    })).min(1).max(14) }),
]);

export type ImportPayload = z.infer<typeof importPayload>;
