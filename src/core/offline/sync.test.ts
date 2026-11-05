import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backoffDelay } from './backoff';
import { KochivoDB } from './db';
import { stableId, uuidv7 } from './ids';
import { saveAndQueue } from './outbox';
import { flushOutbox, type SyncTransport } from './sync';
import type { SetLogRow, WorkoutSessionRow } from './tables';

let db: KochivoDB;

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
