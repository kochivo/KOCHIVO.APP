import { expect, it, vi } from 'vitest';
import { emptyWarmup, type DayWarmup } from '@/features/programs';
import { readWarmupProgress, saveWarmupProgress, warmupPending, rampPrescription, firstWeightedExercise } from './data/warmup-state';
vi.mock('server-only', () => ({}));

const warmup: DayWarmup = { ramp: true, items: [
  { id: 'a', name: 'عجلة خفيفة', amount: 5, unit: 'min' },
  { id: 'b', name: 'مطاطة: فتح صدر', amount: 15, unit: 'reps' },
] };
function storage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); } };
}
it('has no gate for empty or ramp-only warm-ups', () => {
  expect(warmupPending(emptyWarmup(), { checked: [], skipped: false })).toBe(false);
  expect(warmupPending({ items: [], ramp: true }, { checked: [], skipped: false })).toBe(false);
});
it('persists ticks across reloads of the same stable session, without leaking to another session', () => {
  const local = storage();
  saveWarmupProgress(local, 'session-a', { checked: ['a'], skipped: false });
  const reloaded = readWarmupProgress(local, 'session-a');
  expect(reloaded.checked).toEqual(['a']);
  expect(warmupPending(warmup, reloaded)).toBe(true);
  expect(readWarmupProgress(local, 'session-b')).toEqual({ checked: [], skipped: false });
  saveWarmupProgress(local, 'session-a', { checked: ['a', 'b'], skipped: false });
  expect(warmupPending(warmup, readWarmupProgress(local, 'session-a'))).toBe(false);
});
it('persists skip and resumes the normal workout even with unchecked items', () => {
  const local = storage();
  saveWarmupProgress(local, 'session', { checked: [], skipped: true });
  expect(warmupPending(warmup, readWarmupProgress(local, 'session'))).toBe(false);
});
it('recovers from corrupt or unavailable local storage', () => {
  expect(readWarmupProgress({ getItem: () => '{' }, 'session')).toEqual({ checked: [], skipped: false });
  expect(readWarmupProgress({ getItem: () => { throw new Error('blocked'); } }, 'session')).toEqual({ checked: [], skipped: false });
  expect(() => saveWarmupProgress({ setItem: () => { throw new Error('blocked'); } }, 'session', { checked: [], skipped: true })).not.toThrow();
});
it('uses T-197 ramp rounding for known kg, and percentages without a working weight', () => {
  expect(rampPrescription(63, 'en')).toBe('32.5 kg × 10 · 45 kg × 5 · 52.5 kg × 2');
  expect(rampPrescription(null, 'ar')).toBe('50% × 10 · 70% × 5 · 85% × 2');
  expect(rampPrescription(0, 'en')).toBe('50% × 10 · 70% × 5 · 85% × 2');
});
it('places ramp sets on the first exercise not marked bodyweight', () => {
  expect(firstWeightedExercise([{ id: 'a', exercise_id: 'pushup' }, { id: 'b', exercise_id: 'bench' }],
    id => id === 'pushup')).toBe('b');
  expect(firstWeightedExercise([{ id: 'a', exercise_id: 'pushup' }], () => true)).toBeUndefined();
});
