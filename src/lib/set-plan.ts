import { z } from 'zod';

export const dropSchema = z.object({
  count: z.number().int().min(1).max(3),
  percent: z.number().int().min(10).max(40),
  mode: z.enum(['failure', 'reps']),
  reps: z.number().int().min(1).max(50).nullable().optional(),
}).strict().refine(drop => drop.mode !== 'reps' || drop.reps != null);
export type DropConfig = z.infer<typeof dropSchema>;

export function dropWeights(weight: number, count: number, percent: number): number[] {
  return Array.from({ length: count }, () => {
    weight = Math.round(weight * (1 - percent / 100) / 2.5) * 2.5;
    return weight;
  });
}

export const setTargetSchema = z.object({
  reps_min: z.number().int().min(1).max(100),
  reps_max: z.number().int().min(1).max(2147483647).nullable(),
  rir: z.number().int().min(0).max(5).nullable(),
  drop: dropSchema.optional(),
}).strict().refine(row => row.reps_max === null || row.reps_max >= row.reps_min);
export const setPlanSchema = z.array(setTargetSchema).min(1).max(20);
export type SetTarget = z.infer<typeof setTargetSchema>;
type Prescription = { sets: number; reps_min: number; reps_max: number | null;
  rir?: number | null; set_plan?: SetTarget[] | null };

export function uniformPlan(row: Prescription): SetTarget[] {
  return Array.from({ length: row.sets }, () => ({ reps_min: row.reps_min, reps_max: row.reps_max, rir: row.rir ?? null }));
}
export function resizePlan(plan: readonly SetTarget[], sets: number): SetTarget[] {
  const last = plan.at(-1);
  if (!last) return [];
  return Array.from({ length: sets }, (_, index) => ({ ...(plan[index] ?? last) }));
}
/** Zero-based index, unlike the one-based set_index used in workout logs. */
export function targetForSet(row: Prescription, index: number): SetTarget {
  return row.set_plan?.[index] ?? { reps_min: row.reps_min, reps_max: row.reps_max, rir: row.rir ?? null };
}
export function planLabel(plan: readonly SetTarget[]): string {
  return plan.map(row => row.reps_max === null || row.reps_max === row.reps_min ? String(row.reps_min)
    : `${row.reps_min}–${row.reps_max}`).join(' · ');
}
