import { beforeEach, expect, it, vi } from 'vitest';
import { listInbox } from './inbox';

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./client', () => ({ inboxClient: mocks.client }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'en', getT: async () => (key: string) => key }));
const at = '2026-11-04T12:00:00Z';
const id = (index: number) => `019a0000-0000-7000-8000-${String(index).padStart(12, '0')}`;
const row = (index: number) => ({ id: id(index), player_id: 'player', created_at: at,
  reviewed_at: null, captain_reply: null, exercise_id: 'exercise', note: null });

function fakeClient(forms = [row(1)], checks: ReturnType<typeof row>[] = []) {
  const builders = new Map<string, ReturnType<typeof query>>();
  function query(table: string) {
    const result = { data: table === 'form_checks' ? forms : table === 'check_ins' ? checks : [], error: null };
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
  }
  mocks.client.mockResolvedValue({ auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } } }) },
    from: (table: string) => { const builder = query(table); builders.set(table, builder); return builder; } });
  return builders;
}
beforeEach(() => vi.clearAllMocks());

it('caps each owner-filtered open query and the merged page at 50', async () => {
  const builders = fakeClient(Array.from({ length: 50 }, (_, i) => row(i * 2)),
    Array.from({ length: 50 }, (_, i) => row(i * 2 + 1)));
  const result = await listInbox({ status: 'open', limit: 50 });
  expect(result.data?.map(item => item.id)).toEqual(Array.from({ length: 50 }, (_, i) => id(i)));
  expect(result).toHaveProperty('nextCursor', { created_at: at, id: id(49) });
  for (const table of ['form_checks', 'check_ins']) {
    expect(builders.get(table)?.limit).toHaveBeenCalledWith(50);
    expect(builders.get(table)?.eq).toHaveBeenCalledWith('captain_id', 'captain');
    expect(builders.get(table)?.order.mock.calls).toEqual([['created_at', { ascending: false }], ['id']]);
    expect(builders.get(table)?.or).not.toHaveBeenCalled();
  }
});

it('applies a matching keyset filter to both tables and ends a short page', async () => {
  const builders = fakeClient([], [row(51)]);
  const result = await listInbox({ status: 'open', limit: 50, cursor: { created_at: at, id: id(49) } });
  for (const table of ['form_checks', 'check_ins']) {
    expect(builders.get(table)?.or).toHaveBeenCalledWith(`created_at.lt.${at},and(created_at.eq.${at},id.gt.${id(49)})`);
  }
  expect(result.data?.map(item => item.id)).toEqual([id(51)]);
  expect(result).toHaveProperty('nextCursor', null);
});

it('rejects malformed cursors before making a request', async () => {
  expect(await listInbox({ status: 'open', limit: 50, cursor: { created_at: 'bad,filter', id: id(1) } })).toHaveProperty('error');
  expect(mocks.client).not.toHaveBeenCalled();
});

it('preserves PostgreSQL microseconds at the merged page boundary', async () => {
  const older = { ...row(50), created_at: '2026-11-03T12:00:00.000001Z' };
  const newer = { ...row(51), created_at: '2026-11-03T12:00:00.000002Z' };
  fakeClient([...Array.from({ length: 49 }, (_, i) => row(i)), older], [newer]);
  const result = await listInbox({ status: 'open', limit: 50 });
  expect(result.data?.at(-1)?.id).toBe(newer.id);
  expect(result).toHaveProperty('nextCursor', { created_at: newer.created_at, id: newer.id });
});

it('keeps reviewed queries capped and ignores open paging there', async () => {
  const builders = fakeClient();
  const result = await listInbox({ status: 'reviewed', limit: 50 });
  expect(result.data).toHaveLength(1);
  for (const table of ['form_checks', 'check_ins']) {
    expect(builders.get(table)?.limit).toHaveBeenCalledWith(50);
    expect(builders.get(table)?.order).toHaveBeenCalledWith('reviewed_at', { ascending: false });
    expect(builders.get(table)?.or).not.toHaveBeenCalled();
  }
});
