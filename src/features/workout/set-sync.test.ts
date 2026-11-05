import { afterEach, beforeEach, expect, it } from 'vitest';
import { liveQuery } from 'dexie';
import { KochivoDB } from '@/core/offline/db';
import { flushOutbox } from '@/core/offline/sync';
import type { SyncTransport } from '@/core/offline/sync';
import { logSet, startSession } from './data/log-set';
import { setId } from './ids';

const now = Date.parse('2026-11-03T10:00:00Z');
const input = { session_id: 'session', program_exercise_id: 'item', exercise_id: 'exercise',
  set_index: 1, weight_kg: 60, reps: 8 };
let db: KochivoDB;
beforeEach(() => { db = new KochivoDB('set-sync-test'); });
afterEach(async () => { await db.delete(); });

it('publishes the local completed set while the transport has not acknowledged it', async () => {
  let observe: (() => void) | undefined;
  const visible = new Promise<void>(resolve => { observe = resolve; });
  const subscription = liveQuery(() => db.set_logs.toArray()).subscribe(rows => {
    if (rows.some(row => row.reps === 8 && row.deleted_at === null)) observe?.();
  });
  let release: (() => void) | undefined;
  const acknowledgement = new Promise<void>(resolve => { release = resolve; });
  try {
    await logSet(db, input, now);
    await visible;
    let started: (() => void) | undefined;
    const sending = new Promise<void>(resolve => { started = resolve; });
    const flushing = flushOutbox(db, async () => { started?.(); await acknowledgement; }, now);
    await sending;
    expect(await db.set_logs.toArray()).toEqual([expect.objectContaining({ weight_kg: 60, reps: 8 })]);
    expect(await db.outbox.count()).toBe(1);
    release?.();
    expect(await flushing).toEqual({ sent: 1, failed: 0 });
  } finally { release?.(); subscription.unsubscribe(); }
});

it('retains the session, latest set and retry schedule through closing and reopening IndexedDB', async () => {
  const session = await startSession(db, { id: 'day' }, '2026-11-03', now);
  await logSet(db, { ...input, session_id: session.id }, now);
  await logSet(db, { ...input, session_id: session.id, weight_kg: 62.5 }, now + 1);
  expect(await flushOutbox(db, async table => {
    if (table === 'set_logs') throw new Error('offline');
  }, now + 1)).toEqual({ sent: 1, failed: 1 });
  db.close();
  db = new KochivoDB('set-sync-test');
  expect(await db.workout_sessions.count()).toBe(1);
  expect(await db.set_logs.count()).toBe(1);
  expect(await db.set_logs.get(await setId(session.id, 'item', 1))).toMatchObject({ weight_kg: 62.5 });
  const delivered: string[] = [];
  const send: SyncTransport = async (table, rows) => {
    delivered.push(table);
    if (table === 'set_logs') expect(rows).toEqual([expect.objectContaining({ weight_kg: 62.5 })]);
  };
  expect(await flushOutbox(db, send, now + 2000)).toEqual({ sent: 0, failed: 0 });
  expect(delivered).toEqual([]);
  expect(await flushOutbox(db, send, now + 2001)).toEqual({ sent: 1, failed: 0 });
  expect(delivered).toEqual(['set_logs']);
  expect(await db.outbox.count()).toBe(0);
});

it('keeps a newer edit during an in-flight send, including across reload', async () => {
  await logSet(db, input, now);
  await flushOutbox(db, async () => { await logSet(db, { ...input, reps: 10 }, now + 1); }, now);
  db.close();
  db = new KochivoDB('set-sync-test');
  expect(await db.outbox.count()).toBe(1);
  await flushOutbox(db, async (table, rows) => {
    expect(table).toBe('set_logs');
    expect(rows).toEqual([expect.objectContaining({ reps: 10 })]);
  }, now + 1);
  expect(await db.outbox.count()).toBe(0);
  expect(await db.set_logs.count()).toBe(1);
});

it('does not apply an old failed request’s backoff to a newer edit', async () => {
  await logSet(db, input, now);
  await flushOutbox(db, async () => { throw new Error('offline'); }, now);
  await flushOutbox(db, async () => {
    await logSet(db, { ...input, reps: 12 }, now + 2001);
    throw new Error('old request failed');
  }, now + 2000);
  expect(await db.outbox.toArray()).toEqual([expect.objectContaining({
    attempts: 0, revision: 2, next_attempt_at: now + 2001,
  })]);
  expect((await db.outbox.toArray())[0]?.last_error).toBeUndefined();
  expect(await flushOutbox(db, async (_table, rows) => {
    expect(rows).toEqual([expect.objectContaining({ reps: 12 })]);
  }, now + 2001)).toEqual({ sent: 1, failed: 0 });
});

it('rolls back the local set if enqueueing fails, so a visible saved set cannot lose its queue entry', async () => {
  db.outbox.hook('creating', () => { throw new Error('storage full'); });
  await expect(logSet(db, input, now)).rejects.toThrow('storage full');
  expect(await db.set_logs.count()).toBe(0);
  expect(await db.outbox.count()).toBe(0);
});
