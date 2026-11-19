import { afterEach, beforeEach, expect, it } from 'vitest';
import { KochivoDB, stableId, flushOutbox } from '@/core/offline';
import { groupByTiming, supplementAdherence } from './model';
import { setSupplementTaken, toggleTodaySupplement } from './data/log-supplement';
import { mergeSupplementLogs } from './data/refresh';

const now = Date.parse('2026-11-04T10:00:00Z');
let db: KochivoDB;
beforeEach(() => { db = new KochivoDB('supplements-test'); });
afterEach(async () => { await db.delete(); });

it('groups by timing in daily order and position', () => {
  const rows = [{ id: 'b', timing: 'before_bed', position: 0 }, { id: 'a', timing: 'morning', position: 2 }, { id: 'c', timing: 'morning', position: 1 }] as const;
  expect(groupByTiming([...rows]).map(g => [g.timing, g.items.map(i => i.id)])).toEqual([['morning', ['c', 'a']], ['before_bed', ['b']]]);
});

it('counts unique ticks in the Cairo window, excluding future dates and unrelated rows', () => {
  const logs = ['2026-10-28', '2026-10-29', '2026-11-04', '2026-11-04', '2026-11-05'].map(log_date => ({ supplement_id: 'a', log_date, taken_at: 'yes' }));
  expect(supplementAdherence(logs, [{ id: 'a', created_at: '2026-10-01T00:00:00Z' }], 7, now)).toBeCloseTo(2 / 7);
  expect(supplementAdherence(logs, [], 7, now)).toBe(0);
  expect(supplementAdherence(logs, [{ id: 'b', created_at: '2026-10-01T00:00:00Z' }], 7, now)).toBe(0);
});

it('ticks and unticks locally before sync, coalescing stable ids and retrying', async () => {
  await setSupplementTaken(db, 'a', '2026-11-04', true, now);
  const id = await stableId('supplement_log', 'a', '2026-11-04');
  expect((await db.supplement_logs.get(id))?.taken_at).toBe(new Date(now).toISOString());
  expect(id).toBe(await stableId('supplement_log', 'a', '2026-11-04'));
  expect(id).not.toBe(await stableId('supplement_log', 'a', '2026-11-05'));
  await setSupplementTaken(db, 'a', '2026-11-04', false, now + 1);
  expect((await db.supplement_logs.get(id))?.deleted_at).toBeTruthy();
  expect(await db.outbox.count()).toBe(1);
  expect((await flushOutbox(db, async () => { throw new Error('offline'); }, now + 2)).failed).toBe(1);
  await flushOutbox(db, async (table, rows) => { expect(table).toBe('supplement_logs'); expect(rows[0]).toMatchObject({ id, taken_at: null }); }, now + 10000);
  expect(await db.outbox.count()).toBe(0);
});

it('does not replace a pending offline untick with an older server tick', async () => {
  await setSupplementTaken(db, 'a', '2026-11-04', false, now);
  const id = await stableId('supplement_log', 'a', '2026-11-04');
  await mergeSupplementLogs(db, [{ id, supplement_id: 'a', log_date: '2026-11-04', taken_at: 'earlier', deleted_at: null, client_updated_at: 'earlier' }]);
  expect((await db.supplement_logs.get(id))?.taken_at).toBeNull();
  expect(await db.outbox.count()).toBe(1);
});

it('preserves a synced untick when an older refresh finishes late', async () => {
  await setSupplementTaken(db, 'a', '2026-11-04', false, now);
  const id = await stableId('supplement_log', 'a', '2026-11-04');
  await flushOutbox(db, async () => {}, now);
  await mergeSupplementLogs(db, [{ id, supplement_id: 'a', log_date: '2026-11-04', taken_at: 'earlier', deleted_at: null, client_updated_at: new Date(now - 1).toISOString() }]);
  expect((await db.supplement_logs.get(id))?.taken_at).toBeNull();
});

it('uses Cairo midnight and ignores unticked records', () => {
  const logs = [{ supplement_id: 'a', log_date: '2026-11-05', taken_at: 'yes' },
    { supplement_id: 'a', log_date: '2026-11-04', taken_at: null }];
  expect(supplementAdherence(logs, [{ id: 'a', created_at: '2026-10-01T00:00:00Z' }], 1, Date.parse('2026-11-04T22:30:00Z'))).toBe(1);
  expect(supplementAdherence(logs, [{ id: 'a', created_at: '2026-10-01T00:00:00Z' }], 0, now)).toBe(0);
});

it('writes the current day after midnight even with yesterday ticked and no refresh', async () => {
  await setSupplementTaken(db, 'a', '2026-11-04', true, now);
  const afterMidnight = Date.parse('2026-11-04T22:30:00Z');
  expect(await toggleTodaySupplement(db, 'a', afterMidnight)).toBe('2026-11-05');
  const todayId = await stableId('supplement_log', 'a', '2026-11-05');
  expect((await db.supplement_logs.get(todayId))?.taken_at).toBeTruthy();
  await toggleTodaySupplement(db, 'a', afterMidnight + 1);
  expect((await db.supplement_logs.get(todayId))?.taken_at).toBeNull();
  const yesterdayId = await stableId('supplement_log', 'a', '2026-11-04');
  expect((await db.supplement_logs.get(yesterdayId))?.taken_at).toBeTruthy();
});
