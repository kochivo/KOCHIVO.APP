import { afterEach, expect, it } from 'vitest';
import { KochivoDB } from '@/core/offline';
import type { SnapshotExercise } from '@/core/offline';
import { applyAlternative, alternativeStep, readChoices, saveChoices } from './data/exercise-choices';
import { logSet } from './data/log-set';
import { lastSession } from './data/last-performance';
import { prHistory } from './data/pr-history';

const row: SnapshotExercise = { id: 'prescription', exercise_id: 'bench', position: 1, sets: 2, reps_min: 8, reps_max: 12,
  rest_seconds: 90, superset_group: null, rpe: null, tempo: null, notes: null, name_ar: null, name_en: 'Bench', media_path: null,
  alternatives: ['press'], alternative_exercises: [{ id: 'press', name_ar: null, name_en: 'Press', media_path: 'press.gif' }] };
const db = new KochivoDB('alternative-switch');
afterEach(async () => { await db.delete(); });
it('keeps prescription identity and logs the chosen exercise offline with its own history and PRs', async () => {
  const chosen = applyAlternative(row, 'press');
  expect(chosen).toMatchObject({ id: 'prescription', exercise_id: 'press', name_en: 'Press', media_path: 'press.gif' });
  const now = Date.parse('2026-11-12T10:00:00Z');
  await logSet(db, { session_id: 'old', program_exercise_id: row.id, exercise_id: 'press', set_index: 1, weight_kg: 40, reps: 12 }, now);
  await logSet(db, { session_id: 'current', program_exercise_id: chosen.id, exercise_id: chosen.exercise_id, set_index: 1, weight_kg: 45, reps: 10 }, now + 1);
  const saved = await db.set_logs.where('session_id').equals('current').first();
  expect(saved).toMatchObject({ exercise_id: 'press', program_exercise_id: 'prescription' });
  expect(await db.outbox.count()).toBe(2);
  expect(await lastSession(db, chosen.exercise_id, 'current')).toMatchObject({ sets: [{ set_index: 1, weight_kg: 40, reps: 12 }] });
  expect((await prHistory(db, chosen.exercise_id, saved?.id ?? '')).map(item => item.session_id)).toEqual(['old']);
  expect(row.exercise_id).toBe('bench');
  const step = { exercise: row, setIndex: 1, restAfter: 90 };
  expect(alternativeStep(step, undefined)).toBe(step);
  expect(alternativeStep(undefined, 'press')).toBeUndefined();
  expect(alternativeStep(step, 'press')?.exercise.exercise_id).toBe('press');
});
it('restores choices only for their session and rejects stale or unapproved identities', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
  saveChoices(storage, 'session-a', { prescription: 'press' });
  expect(readChoices(storage, 'session-a')).toEqual({ prescription: 'press' });
  expect(readChoices(storage, 'session-b')).toEqual({});
  expect(applyAlternative(row, 'unapproved')).toBe(row);
  expect(applyAlternative({ ...row, alternatives: undefined }, 'press').exercise_id).toBe('bench');
  values.set('exercise-choices:session-a', '{broken');
  expect(readChoices(storage, 'session-a')).toEqual({});
});

it('keeps choices usable when browser storage is blocked', () => {
  expect(readChoices({ getItem() { throw new Error('blocked'); } }, 'session')).toEqual({});
  expect(() => saveChoices({ setItem() { throw new Error('full'); } }, 'session', { prescription: 'press' })).not.toThrow();
});
