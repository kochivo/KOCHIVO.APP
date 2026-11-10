import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backoffDelay } from './backoff';
import { KochivoDB } from './db';
import { stableId, uuidv7 } from './ids';
import { parkedCount, pendingCount, retryParked, saveAndQueue } from './outbox';
import { flushOutbox, type SyncTransport } from './sync';
import type { SetLogRow, WorkoutSessionRow } from './tables';

let db: KochivoDB;
const capture = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException: capture }));

beforeEach(() => {
  db = new KochivoDB(`test-${uuidv7()}`);
});
afterEach(async () => {
  await db.delete();
});

const session = (id = uuidv7()): WorkoutSessionRow => ({
  id,
  program_day_id: uuidv7(),
  training_date: '2026-11-03',
  started_at: '2026-11-03T08:00:00Z',
  completed_at: null,
  client_updated_at: '2026-11-03T08:00:00Z',
});

const setLog = (sessionId: string, setIndex: number, weight = 60): SetLogRow => ({
  id: uuidv7(),
  session_id: sessionId,
  program_exercise_id: 'pe-1',
  exercise_id: 'ex-1',
  set_index: setIndex,
  weight_kg: weight,
  reps: 8,
  completed_at: '2026-11-03T08:05:00Z',
  client_updated_at: '2026-11-03T08:05:00Z',
  deleted_at: null,
});

describe('saveAndQueue', () => {
  it('writes the row locally and queues it once even when saved twice', async () => {
    const s = session();
    const row = setLog(s.id, 0);
    await saveAndQueue(db, 'set_logs', row, 1000);
    await saveAndQueue(db, 'set_logs', { ...row, weight_kg: 62.5 }, 2000);

    expect((await db.set_logs.get(row.id))?.weight_kg).toBe(62.5);
    const queue = await db.outbox.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0]?.revision).toBe(2);
  });
});

describe('flushOutbox', () => {
  it.each(['parked', 'backoff', 'failed'] as const)('holds only the sets of a %s parent session', async state => {
    const s1 = session('s1');
    const s2 = session('s2');
    await db.workout_sessions.put(s2);
    await saveAndQueue(db, 'workout_sessions', s1, state === 'backoff' ? 10000 : 1000);
    if (state === 'parked') await db.outbox.toCollection().modify({ parked: true, next_attempt_at: Number.MAX_SAFE_INTEGER });
    const held = setLog(s1.id, 0);
    const ready = setLog(s2.id, 0);
    await saveAndQueue(db, 'set_logs', held, 1000);
    await saveAndQueue(db, 'set_logs', ready, 1000);
    const sent: string[] = [];
    const result = await flushOutbox(db, async (table, rows) => {
      if (table === 'workout_sessions') throw new Error('offline');
      sent.push(...rows.map(row => row.id));
    }, 5000);
    expect(sent).toEqual([ready.id]);
    expect(result).toEqual({ sent: 1, failed: state === 'failed' ? 2 : 1 });
    expect((await db.outbox.toArray()).find(e => e.row_id === held.id)).toMatchObject({ attempts: 0, next_attempt_at: 1000 });
    expect(await db.set_logs.get(held.id)).toEqual(held);
  });
  it('isolates permanent rows, holds sets and recovers after a re-save', async () => {
    const s = session('bad');
    await saveAndQueue(db, 'workout_sessions', s, 1000);
    await saveAndQueue(db, 'set_logs', setLog(s.id, 0), 1000);
    await saveAndQueue(db, 'meal_logs', { id: 'meal', meal_id: 'm', log_date: '2026-11-03', swaps: {}, completed_at: null, client_updated_at: s.client_updated_at, deleted_at: null }, 1000);
    const calls: string[] = [];
    await flushOutbox(db, async (table) => {
      calls.push(table);
      if (table === 'workout_sessions') throw Object.assign(new Error('private'), { code: '42501', permanent: true });
    }, 5000);
    expect(calls).toEqual(['workout_sessions', 'workout_sessions', 'meal_logs']);
    expect(await parkedCount(db)).toBe(1);
    expect(await pendingCount(db)).toBe(2);
    expect((await db.outbox.toArray()).find(e => e.table === 'set_logs')?.attempts).toBe(0);
    await flushOutbox(db, async () => { throw new Error('must not send'); }, 10000);
    await saveAndQueue(db, 'workout_sessions', s, 11000);
    expect(await parkedCount(db)).toBe(0);
    expect(await flushOutbox(db, async () => undefined, 11000)).toEqual({ sent: 2, failed: 0 });
    expect(await db.workout_sessions.get(s.id)).toEqual(s);
  });
  it('isolates one rejected row in a batch of 50 and reports only safe metadata once', async () => {
    capture.mockClear();
    for (let i = 0; i < 50; i++) await saveAndQueue(db, 'workout_sessions', session(String(i)), 1000);
    const send: SyncTransport = async (_table, rows) => {
      if (rows.some(row => row.id === '7')) throw Object.assign(new Error('private'), { code: '23514', permanent: true });
    };
    expect(await flushOutbox(db, send, 5000)).toEqual({ sent: 49, failed: 1 });
    await flushOutbox(db, send, 10000);
    expect((await db.outbox.toArray()).map(e => e.row_id)).toEqual(['7']);
    await vi.dynamicImportSettled();
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(new Error('Outbox entry parked'), { tags: { table: 'workout_sessions', code: '23514' } });
  });
  it('parks on failure 12, resets on retry and never parks an account change', async () => {
    await saveAndQueue(db, 'workout_sessions', session(), 1000);
    const send: SyncTransport = async () => { throw new Error('offline'); };
    for (let i = 0; i < 11; i++) await flushOutbox(db, send, 1000 + i * 300000);
    expect(await parkedCount(db)).toBe(0);
    await flushOutbox(db, send, 4000000);
    expect(await parkedCount(db)).toBe(1);
    await retryParked(db, 5000000);
    expect(await parkedCount(db)).toBe(0);
    for (let i = 0; i < 13; i++) await flushOutbox(db, async () => { throw new Error('Sync account changed'); }, 5000000 + i * 300000);
    expect(await parkedCount(db)).toBe(0);
  });
  it('does not park or delay a revision re-saved during a permanent rejection', async () => {
    const s = session('race');
    await saveAndQueue(db, 'workout_sessions', s, 1000);
    await flushOutbox(db, async () => {
      await saveAndQueue(db, 'workout_sessions', s, 6000);
      throw Object.assign(new Error('rejected'), { code: '42501', permanent: true });
    }, 5000);
    expect(await parkedCount(db)).toBe(0);
    expect((await db.outbox.toArray())[0]).toMatchObject({ attempts: 0, next_attempt_at: 6000 });
  });
  it('retryParked changes only the current owner and invalidates an in-flight revision', async () => {
    await db.delete();
    db = new KochivoDB('owner-retry', 'owner');
    await saveAndQueue(db, 'workout_sessions', session('own'), 1000);
    await db.outbox.toCollection().modify({ parked: true, attempts: 12, next_attempt_at: Number.MAX_SAFE_INTEGER });
    await db.outbox.add({ owner_id: 'other', table: 'workout_sessions', row_id: 'foreign', revision: 1, enqueued_at: 1000, attempts: 12, parked: true, next_attempt_at: Number.MAX_SAFE_INTEGER });
    await retryParked(db, 2000);
    const rows = await db.outbox.toArray();
    expect(rows.find(e => e.row_id === 'own')).toMatchObject({ parked: false, attempts: 0, revision: 2, next_attempt_at: 2000 });
    expect(rows.find(e => e.row_id === 'foreign')?.parked).toBe(true);
  });
  it('keeps failed and unsent batches across a fresh Dexie instance after partial success', async () => {
    const rows = Array.from({ length: 101 }, (_, index) => session(uuidv7(1000 + index)));
    for (const row of rows) await saveAndQueue(db, 'workout_sessions', row, 1000);
    const accepted: string[] = [];
    let batches = 0;
    const result = await flushOutbox(db, async (_table, batch) => {
      batches++;
      if (batches === 2) throw new Error('connection lost');
      accepted.push(...batch.map(row => row.id));
    }, 5000);
    expect(result).toEqual({ sent: 50, failed: 51 });
    expect(accepted).toEqual(rows.slice(0, 50).map(row => row.id));
    const name = db.name;
    db.close();
    db = new KochivoDB(name);
    const pending = await db.outbox.toArray();
    expect(pending.map(entry => entry.row_id)).toEqual(rows.slice(50).map(row => row.id));
    expect(pending.slice(0, 50).every(entry => entry.attempts === 1 && entry.next_attempt_at === 7000)).toBe(true);
    expect(pending.at(-1)?.attempts).toBe(0);
    expect(await db.workout_sessions.count()).toBe(101);
    expect(await flushOutbox(db, async (_table, batch) => {
      accepted.push(...batch.map(row => row.id));
    }, 7000)).toEqual({ sent: 51, failed: 0 });
    expect(accepted.sort()).toEqual(rows.map(row => row.id).sort());
    expect(await db.outbox.count()).toBe(0);
  });

  it('sends sessions before sets and clears the queue on success', async () => {
    const s = session();
    await saveAndQueue(db, 'set_logs', setLog(s.id, 0), 1000);
    await saveAndQueue(db, 'workout_sessions', s, 1000);

    const calls: string[] = [];
    const send: SyncTransport = async (table) => {
      calls.push(table);
    };
    const result = await flushOutbox(db, send, 5000);

    expect(calls).toEqual(['workout_sessions', 'set_logs']);
    expect(result).toEqual({ sent: 2, failed: 0 });
    expect(await db.outbox.count()).toBe(0);
  });

  it('keeps entries with backoff on failure and stops dependent tables', async () => {
    const s = session();
    await saveAndQueue(db, 'workout_sessions', s, 1000);
    await saveAndQueue(db, 'set_logs', setLog(s.id, 0), 1000);

    const send = vi.fn<SyncTransport>().mockRejectedValue(new Error('offline'));
    const result = await flushOutbox(db, send, 5000);

    expect(send).toHaveBeenCalledTimes(1);
    expect(result.failed).toBe(2);
    const entry = await db.outbox.where('table').equals('workout_sessions').first();
    expect(entry?.attempts).toBe(1);
    expect(entry?.next_attempt_at).toBe(5000 + backoffDelay(1));
    expect(entry?.last_error).toBe('offline');
  });

  it('skips entries that are not due yet', async () => {
    await saveAndQueue(db, 'workout_sessions', session(), 10_000);
    const send = vi.fn<SyncTransport>().mockResolvedValue(undefined);
    await flushOutbox(db, send, 5000);
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps a row that was edited while its sync request was in flight', async () => {
    const s = session();
    await saveAndQueue(db, 'workout_sessions', s, 1000);
    const send: SyncTransport = async () => {
      await saveAndQueue(db, 'workout_sessions', { ...s, completed_at: '2026-11-03T09:00:00Z' }, 1500);
    };
    await flushOutbox(db, send, 2000);
    expect(await db.outbox.count()).toBe(1);
  });
});

describe('backoffDelay', () => {
  it('grows exponentially and caps at 5 minutes', () => {
    expect(backoffDelay(0)).toBe(0);
    expect(backoffDelay(1)).toBe(2000);
    expect(backoffDelay(3)).toBe(8000);
    expect(backoffDelay(20)).toBe(300_000);
  });
});

describe('stableId', () => {
  it('gives the same id for the same parts on any device, and differs otherwise', async () => {
    const a = await stableId('session-1', 'pe-1', '0');
    expect(a).toBe(await stableId('session-1', 'pe-1', '0'));
    expect(a).not.toBe(await stableId('session-1', 'pe-1', '1'));
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('uuidv7', () => {
  it('is a valid v7 uuid that sorts by time', () => {
    const a = uuidv7(1_000_000);
    const b = uuidv7(2_000_000);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
  });
});
