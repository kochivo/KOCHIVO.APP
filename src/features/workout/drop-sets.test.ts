import { expect, it } from 'vitest';
import type { SnapshotDay, SnapshotExercise } from '@/core/offline';
import { buildQueue } from './queue';
import { detectPr } from './pr';
import { latestSession } from './data/last-performance';
import { KochivoDB, stableId } from '@/core/offline';
import { setId } from './ids';
import { logSet } from './data/log-set';
import { dropWeights } from '@/lib/set-plan';
import { finishSummary } from './data/finish-summary';

const exercise = (id: string, position: number): SnapshotExercise => ({ id, exercise_id: id, position, sets: 2,
  reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: 1, rpe: null, tempo: null,
  notes: null, name_ar: null, name_en: id, media_path: null });
it('queues drops before the next member and rests only after the last member and its drops', () => {
  const first = { ...exercise('a', 1), set_plan: [{ reps_min: 8, reps_max: 12, rir: null,
    drop: { count: 2, percent: 20, mode: 'failure' as const, reps: null } }] };
  const day: SnapshotDay = { id: 'day', title: 'Day', position: 1, exercises: [first, exercise('b', 2)] };
  expect(buildQueue(day).map(step => [step.exercise.id, step.setIndex, 'dropIndex' in step ? step.dropIndex : 0, step.restAfter]))
    .toEqual([['a', 1, 0, 0], ['a', 1, 1, 0], ['a', 1, 2, 0], ['b', 1, 0, 90], ['a', 2, 0, 0], ['b', 2, 0, 0]]);
});
it('ignores drops for records and last time even when a drop is heavier or more recent', () => {
  expect(detectPr([{ weight_kg: 60, reps: 8 }], { weight_kg: 70, reps: 9, drop_index: 1 })).toBeNull();
  const base = { id: 'main', session_id: 'old', set_index: 1, weight_kg: 60, reps: 8, completed_at: '2026-11-01', drop_index: 0 };
  expect(latestSession([base, { ...base, id: 'drop', weight_kg: 47.5, reps: 7, drop_index: 1, completed_at: '2026-11-02' }]))
    .toEqual({ sets: [{ set_index: 1, weight_kg: 60, reps: 8 }] });
});
it('rounds each drop from the previous rounded weight', () => {
  expect(dropWeights(60, 2, 20)).toEqual([47.5, 37.5]);
  expect(dropWeights(2.5, 3, 40)).toEqual([2.5, 2.5, 2.5]);
});
it('logs main and drops independently through the outbox without changing main-set ids', async () => {
  const db = new KochivoDB('drop-log-test');
  try {
    const base = { session_id: 's', program_exercise_id: 'e', exercise_id: 'ex', set_index: 1, weight_kg: 60, reps: 8 };
    await logSet(db, base, 1000);
    await logSet(db, { ...base, drop_index: 1, weight_kg: 47.5, reps: 7 }, 1001);
    const rows = await db.set_logs.toArray();
    expect(rows.map(row => row.drop_index).sort()).toEqual([0, 1]);
    expect(finishSummary(rows, 's')).toMatchObject({ sets: 1, volume: 812.5, records: 0 });
    expect(await db.outbox.count()).toBe(2);
    expect(await setId('s', 'e', 1)).toBe(await stableId('set', 's', 'e', '1'));
    expect(await setId('s', 'e', 1, 1)).toBe(await stableId('set', 's', 'e', '1', 'drop', '1'));
  } finally { await db.delete(); }
});
