import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { localDb, setLocalUser, stableId } from '@/core/offline';
import { setSupplementTaken } from './log-supplement';
import { refreshSupplements } from './refresh';
import { fetchCaptainSupplements } from './captain';

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: mocks.load }));
const now = Date.parse('2026-11-04T22:30:00Z');

function fakeClient() {
  const queries = new Map<string, ReturnType<typeof query>>();
  function query() {
    const result = { data: [], error: null };
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
  }
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'bounded-player' } }, error: null }) },
    from: (table: string) => { const builder = query(); queries.set(table, builder); return builder; } };
  mocks.load.mockResolvedValue(client);
  return queries;
}

beforeEach(async () => {
  vi.stubGlobal('navigator', { onLine: true });
  await setLocalUser('bounded-player');
});
afterEach(async () => {
  const db = localDb();
  await setLocalUser(null);
  await db.delete();
  vi.unstubAllGlobals();
});

it.each([
  ['2026-11-04T21:30:00Z', '2026-10-29'],
  ['2026-11-04T22:30:00Z', '2026-10-30'],
  ['2026-04-24T21:30:00Z', '2026-04-19'],
])('bounds both supplement reads by Cairo calendar days at %s', async (at, cutoff) => {
  let queries = fakeClient();
  await refreshSupplements(Date.parse(at));
  expect(queries.get('supplement_logs')?.gte).toHaveBeenCalledWith('log_date', cutoff);
  expect(queries.get('supplement_logs')?.eq).toHaveBeenCalledWith('player_id', 'bounded-player');
  queries = fakeClient();
  await fetchCaptainSupplements('selected-player', Date.parse(at));
  expect(queries.get('supplement_logs')?.gte).toHaveBeenCalledWith('log_date', cutoff);
  expect(queries.get('supplement_logs')?.eq).toHaveBeenCalledWith('player_id', 'selected-player');
});

it('prunes synced old logs but preserves old pending logs and the inclusive boundary', async () => {
  fakeClient();
  const db = localDb();
  await setSupplementTaken(db, 'pending', '2026-10-29', false, now);
  const pendingId = await stableId('supplement_log', 'pending', '2026-10-29');
  const pending = await db.supplement_logs.get(pendingId);
  if (!pending) throw new Error('Expected pending log');
  await db.supplement_logs.bulkPut([
    { ...pending, id: 'synced', supplement_id: 'synced' }, { ...pending, id: 'boundary', log_date: '2026-10-30' },
  ]);
  await refreshSupplements(now);
  expect(await db.supplement_logs.get('synced')).toBeUndefined();
  expect(await db.supplement_logs.get(pendingId)).toEqual(pending);
  expect(await db.supplement_logs.get('boundary')).toBeDefined();
  expect(await db.outbox.count()).toBe(1);
});
