import { afterEach, beforeEach, expect, it } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { startSession, finishSession } from './data/log-set';
import { saveSessionFeedback, validRpe } from './data/session-feedback';

const db = new KochivoDB('session-feedback-test');
const now = Date.parse('2026-11-05T10:00:00Z');
beforeEach(async () => { await db.open(); });
afterEach(async () => { await db.delete(); });

it('accepts only whole RPE values from 1 to 10', () => {
  for (const value of [1, 5, 10]) expect(validRpe(value)).toBe(true);
  for (const value of [0, 11, 1.5, NaN]) expect(validRpe(value)).toBe(false);
});

it('saves feedback locally and queues the full session with a newer timestamp', async () => {
  const session = await startSession(db, { id: 'day' }, '2026-11-05', now);
  await finishSession(db, session.id, now + 1000);
  await saveSessionFeedback(db, session.id, { rpe: 9, note: '  tired  ' }, now + 2000);
  const saved = await db.workout_sessions.get(session.id);
  expect(saved).toMatchObject({ session_rpe: 9, player_note: 'tired',
    completed_at: new Date(now + 1000).toISOString(), client_updated_at: new Date(now + 2000).toISOString() });
  expect((await db.outbox.toArray())[0]).toMatchObject({ table: 'workout_sessions', row_id: session.id, revision: 3 });
});

it('skip writes nothing and invalid feedback never enters the outbox', async () => {
  await saveSessionFeedback(db, 'missing', null, now);
  expect(await db.outbox.count()).toBe(0);
  for (const feedback of [{ rpe: 11, note: '' }, { rpe: 1, note: 'x'.repeat(501) }]) {
    await expect(saveSessionFeedback(db, 'missing', feedback, now)).rejects.toThrow();
  }
  expect(await db.outbox.count()).toBe(0);
});

it('advances LWW even when feedback and completion share a clock tick', async () => {
  const session = await startSession(db, { id: 'day' }, '2026-11-05', now);
  await finishSession(db, session.id, now);
  await saveSessionFeedback(db, session.id, { rpe: 1, note: '  ' }, now);
  expect(await db.workout_sessions.get(session.id)).toMatchObject({ session_rpe: 1, player_note: null,
    client_updated_at: new Date(now + 1).toISOString() });
});
