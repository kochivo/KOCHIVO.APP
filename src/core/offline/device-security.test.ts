import { afterEach, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { KochivoDB, localDb, setLocalUser } from './db';
import { migrateLegacyDb } from './legacy-db';
import { saveAndQueue } from './outbox';
import { flushOutbox } from './sync';

afterEach(async () => {
  await setLocalUser(null);
  for (const name of ['kochivo', 'kochivo-alice', 'kochivo-bob']) await Dexie.delete(name);
});

it('isolates accounts and refuses local access after logout', async () => {
  await setLocalUser('alice');
  expect(localDb().name).toBe('kochivo-alice');
  await localDb().daily_checks.put({ id: 'a', log_date: '2026-11-05', sleep_hours: null,
    soreness: null, water_ml: 500, client_updated_at: '2026-11-05', deleted_at: null });
  await setLocalUser('bob');
  expect(localDb().name).toBe('kochivo-bob');
  expect(await localDb().daily_checks.count()).toBe(0);
  await setLocalUser(null);
  expect(() => localDb()).toThrow();
});

it('drops foreign outbox rows instead of sending them', async () => {
  await setLocalUser('alice');
  const db = localDb();
  await saveAndQueue(db, 'daily_checks', { id: 'a', log_date: '2026-11-05', sleep_hours: null,
    soreness: null, water_ml: 500, client_updated_at: '2026-11-05', deleted_at: null }, 1);
  await db.outbox.toCollection().modify({ owner_id: 'bob' });
  const sent: unknown[] = [];
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  await flushOutbox(db, async (_, rows) => { sent.push(...rows); }, 2);
  expect(sent).toEqual([]);
  expect(await db.outbox.count()).toBe(0);
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
});

it.each(['alice', 'bob', null])('migrates legacy data only with matching snapshot owner: %s', async owner => {
  const legacy = new KochivoDB('kochivo');
  if (owner) await legacy.program_snapshot.put({ id: 'active', player_id: owner, program_id: 'p',
    title: 'Plan', notes: null, settings: {}, training_days: [], days: [] });
  await legacy.daily_checks.put({ id: 'a', log_date: '2026-11-05', sleep_hours: null,
    soreness: null, water_ml: 500, client_updated_at: '2026-11-05', deleted_at: null });
  legacy.close();
  const target = new KochivoDB('kochivo-alice');
  await migrateLegacyDb(target, 'alice');
  expect(await target.daily_checks.count()).toBe(owner === 'alice' ? 1 : 0);
  expect(await Dexie.exists('kochivo')).toBe(false);
  target.close();
});

it('retains distinct pending work when legacy and scoped auto-increment ids collide', async () => {
  const legacy = new KochivoDB('kochivo');
  const target = new KochivoDB('kochivo-alice');
  await legacy.program_snapshot.put({ id: 'active', player_id: 'alice', program_id: 'p',
    title: 'Plan', notes: null, settings: {}, training_days: [], days: [] });
  const pending = { table: 'daily_checks' as const, row_id: 'legacy', revision: 1, enqueued_at: 1,
    attempts: 0, next_attempt_at: 1 };
  await legacy.outbox.add(pending);
  await target.outbox.add({ ...pending, row_id: 'scoped', owner_id: 'alice' });
  legacy.close();
  try {
    await migrateLegacyDb(target, 'alice');
    expect((await target.outbox.toArray()).map(row => [row.row_id, row.owner_id]))
      .toEqual([['scoped', 'alice'], ['legacy', 'alice']]);
  } finally { target.close(); }
});
