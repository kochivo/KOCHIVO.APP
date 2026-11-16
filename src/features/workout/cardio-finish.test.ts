import { afterEach, expect, it } from 'vitest';
import { KochivoDB, type SnapshotDay } from '@/core/offline';
import { buildQueue, isCardioOnly } from './queue';
import { finishCardioSession } from './data/finish-cardio-session';
import { startSession } from './data/log-set';

const day: SnapshotDay = { id: 'cardio-day', title: 'Cardio', position: 1, exercises: [],
  cardio: [{ id: 'walk', day_id: 'cardio-day', position: 1, kind: 'Walk', minutes: 20, intensity: 'low', notes: '' }] };
const now = Date.parse('2026-11-16T10:00:00Z');
const db = new KochivoDB('cardio-finish');
afterEach(async () => { await db.delete(); });

it('offers explicit completion only for cardio with an empty set queue', () => {
  expect(buildQueue(day)).toEqual([]);
  expect(isCardioOnly(day)).toBe(true);
  expect(isCardioOnly({ ...day, cardio: [] })).toBe(false);
  expect(isCardioOnly({ ...day, exercises: [{ id: 'row', exercise_id: 'exercise', position: 1,
    sets: 1, reps_min: 8, reps_max: 12, rest_seconds: 0, superset_group: null,
    rpe: null, tempo: null, notes: null, name_ar: null, name_en: 'Bench', media_path: null }] })).toBe(false);
});

it('finishes offline with one stable session and outbox row across double taps and replay', async () => {
  await db.open();
  await Promise.all([finishCardioSession(db, day, '2026-11-16', now), finishCardioSession(db, day, '2026-11-16', now)]);
  expect((await db.workout_sessions.toArray())[0]?.completed_at).toBeNull();
  await finishCardioSession(db, day, '2026-11-16', now + 20 * 60_000);
  const sessions = await db.workout_sessions.toArray();
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({ program_day_id: day.id, training_date: '2026-11-16',
    started_at: '2026-11-16T10:00:00.000Z', completed_at: '2026-11-16T10:20:00.000Z' });
  await finishCardioSession(db, day, '2026-11-16', now + 60_000);
  expect(await db.workout_sessions.toArray()).toEqual(sessions);
  expect(await db.set_logs.count()).toBe(0);
  expect(await db.outbox.toArray()).toMatchObject([{ table: 'workout_sessions', row_id: sessions[0]?.id }]);
});

it('reuses an unfinished session without changing its start time', async () => {
  await db.open();
  const session = await startSession(db, day, '2026-11-16', now - 60_000);
  await finishCardioSession(db, day, '2026-11-16', now);
  expect(await db.workout_sessions.toArray()).toMatchObject([{ id: session.id,
    started_at: '2026-11-16T09:59:00.000Z', completed_at: '2026-11-16T10:00:00.000Z' }]);
});
