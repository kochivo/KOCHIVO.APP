import { parseTypedNumber } from '@/ui/typed-number';

export type SetValueKind = 'weight' | 'reps';

export function parseSetValue(kind: SetValueKind, text: string): number | null {
  const value = parseTypedNumber(text);
  if (value === null || value <= 0 || value > (kind === 'weight' ? 500 : 100)) return null;
  if (kind === 'reps') return Number.isInteger(value) ? value : null;
  const rounded = Math.round(value * 100) / 100;
  return rounded > 0 ? rounded : null;
}

export function validateSet({ weight, reps, bodyweight }: { weight: number; reps: number; bodyweight: boolean }):
  'ok' | 'weight' | 'reps' | 'both' {
  const validWeight = bodyweight || (Number.isFinite(weight) && weight > 0);
  const validReps = Number.isInteger(reps) && reps >= 1;
  return validWeight ? validReps ? 'ok' : 'reps' : validReps ? 'weight' : 'both';
}
