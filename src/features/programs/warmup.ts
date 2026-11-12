import { z } from 'zod';

export const warmupItemSchema = z.object({
  id: z.uuid(), name: z.string().trim().min(1).max(60), amount: z.number().int().min(1).max(999),
  unit: z.enum(['min', 'sec', 'reps', 'times']), note: z.string().max(80).optional(),
});
export type WarmupItem = z.infer<typeof warmupItemSchema>;
export type DayWarmup = { items: WarmupItem[]; ramp: boolean };

export function emptyWarmup(): DayWarmup {
  return { items: [], ramp: false };
}
export const dayWarmupSchema = z.object({
  items: z.array(warmupItemSchema).max(12), ramp: z.boolean(),
}).default(emptyWarmup);

// Callers supply IDs so these edits stay deterministic and side-effect free.
export function addWarmupItem(warmup: DayWarmup, item: WarmupItem): DayWarmup {
  return dayWarmupSchema.parse({ ...warmup, items: [...warmup.items, item] });
}
export function removeWarmupItem(warmup: DayWarmup, id: string): DayWarmup {
  return { ...warmup, items: warmup.items.filter(item => item.id !== id) };
}
export function moveWarmupItem(warmup: DayWarmup, id: string, delta: -1 | 1): DayWarmup {
  const from = warmup.items.findIndex(item => item.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= warmup.items.length) return warmup;
  const items = [...warmup.items];
  const item = items.splice(from, 1)[0];
  if (item) items.splice(to, 0, item);
  return { ...warmup, items };
}
export function setRamp(warmup: DayWarmup, ramp: boolean): DayWarmup {
  return { ...warmup, ramp };
}
export function warmupMinutes(warmup: DayWarmup): number {
  const seconds = warmup.items.reduce((sum, item) => sum +
    (item.unit === 'min' ? item.amount * 60 : item.unit === 'sec' ? item.amount : 0), 0);
  return Math.ceil(seconds / 60);
}
export function rampSets(workingKg: number | null): { percent: number; reps: number; kg: number | null }[] {
  return [{ percent: 50, reps: 10 }, { percent: 70, reps: 5 }, { percent: 85, reps: 2 }].map(row => ({
    ...row, kg: workingKg === null ? null : Math.round(workingKg * row.percent / 100 / 2.5) * 2.5,
  }));
}
