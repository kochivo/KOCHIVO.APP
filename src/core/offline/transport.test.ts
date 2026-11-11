import type { SupabaseClient } from '@supabase/supabase-js';
import Dexie from 'dexie';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AppDatabase as Database } from '@/types/app-database';
import { localDb, setLocalUser } from './db';
import { saveAndQueue } from './outbox';
import { flushOutbox } from './sync';
import { supabaseTransport } from './transport';

const getUser = vi.fn();
const rpc = vi.fn();
const client = { auth: { getUser }, rpc } as unknown as SupabaseClient<Database>;

beforeEach(async () => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'alice' } }, error: null });
  rpc.mockReset().mockResolvedValue({ error: null });
  await setLocalUser('alice');
});

afterEach(async () => {
  await setLocalUser(null);
  await Dexie.delete('kochivo-alice');
  await Dexie.delete('kochivo-bob');
});

async function queueThreeTables() {
  const db = localDb();
  const common = { client_updated_at: '2026-11-11T08:00:00Z', deleted_at: null };
  await saveAndQueue(db, 'workout_sessions', { id: 'session', program_day_id: 'day',
    training_date: '2026-11-11', started_at: common.client_updated_at, completed_at: null,
    client_updated_at: common.client_updated_at }, 1000);
  await saveAndQueue(db, 'meal_logs', { ...common, id: 'meal', meal_id: 'meal-plan',
    log_date: '2026-11-11', swaps: {}, completed_at: null }, 1000);
  await saveAndQueue(db, 'daily_checks', { ...common, id: 'daily', log_date: '2026-11-11',
    sleep_hours: null, soreness: null, water_ml: 500 }, 1000);
  return db;
}

it('checks identity once before sending a three-table flush', async () => {
  const db = await queueThreeTables();
  rpc.mockImplementation(async () => {
    expect(getUser).toHaveBeenCalledTimes(1);
    return { error: null };
  });
  expect(await flushOutbox(db, supabaseTransport(client, 'alice'), 1000)).toEqual({ sent: 3, failed: 0 });
  expect(rpc).toHaveBeenCalledTimes(3);
  expect(await db.outbox.count()).toBe(0);
});

it('does not check identity for empty, deferred or parked work', async () => {
  const db = localDb();
  const send = supabaseTransport(client, 'alice');
  await flushOutbox(db, send, 1000);
  await queueThreeTables();
  await flushOutbox(db, send, 999);
  await db.outbox.toCollection().modify({ parked: true });
  await flushOutbox(db, send, 1000);
  expect(getUser).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalled();
});

it('checks identity again when the same transport is reused in another flush', async () => {
  const db = await queueThreeTables();
  const send = supabaseTransport(client, 'alice');
  await flushOutbox(db, send, 1000);
  await queueThreeTables();
  getUser.mockResolvedValue({ data: { user: { id: 'bob' } }, error: null });
  expect(await flushOutbox(db, send, 1000)).toEqual({ sent: 0, failed: 3 });
  expect(getUser).toHaveBeenCalledTimes(2);
  expect(rpc).toHaveBeenCalledTimes(3);
  expect((await db.outbox.toArray()).every(e => e.last_error === 'Sync account changed' && !e.parked)).toBe(true);
});

it.each(['other user', 'auth error', 'rejection'])('never sends or parks after %s', async failure => {
  const db = await queueThreeTables();
  await db.outbox.toCollection().modify({ attempts: 11 });
  if (failure === 'rejection') getUser.mockRejectedValue(new Error('Auth unavailable'));
  else getUser.mockResolvedValue({ data: { user: { id: failure === 'other user' ? 'bob' : 'alice' } },
    error: failure === 'auth error' ? new Error('Auth unavailable') : null });
  expect(await flushOutbox(db, supabaseTransport(client, 'alice'), 1000)).toEqual({ sent: 0, failed: 3 });
  expect(getUser).toHaveBeenCalledTimes(1);
  expect(rpc).not.toHaveBeenCalled();
  expect((await db.outbox.toArray()).every(e => e.attempts === 12 && !e.parked && e.last_error === 'Sync account changed')).toBe(true);
});

it('keeps the local guard before every table send', async () => {
  const db = await queueThreeTables();
  rpc.mockImplementationOnce(async () => {
    await setLocalUser('bob');
    await db.open();
    return { error: null };
  });
  expect(await flushOutbox(db, supabaseTransport(client, 'alice'), 1000)).toEqual({ sent: 1, failed: 2 });
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(getUser).toHaveBeenCalledTimes(1);
});

it('checks the local owner again after the identity request', async () => {
  const db = await queueThreeTables();
  getUser.mockImplementationOnce(async () => {
    await setLocalUser('bob');
    await db.open();
    return { data: { user: { id: 'alice' } }, error: null };
  });
  expect(await flushOutbox(db, supabaseTransport(client, 'alice'), 1000)).toEqual({ sent: 0, failed: 3 });
  expect(rpc).not.toHaveBeenCalled();
});
