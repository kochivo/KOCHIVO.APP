import { beforeEach, expect, it, vi } from 'vitest';
import { fetchMoneyOwed } from './money-owed';

vi.mock('server-only', () => ({}));
const fake = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), roster: vi.fn() }));
vi.mock('./client', () => ({ captainClient: async () => ({ captainId: 'captain', client: { rpc: fake.rpc, from: fake.from } }) }));
vi.mock('@/features/roster/server', () => ({ fetchRoster: fake.roster }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
const now = new Date('2026-11-03T23:30:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  fake.roster.mockResolvedValue({ players: [{ playerId: 'soon', fullName: 'A', accessUntil: '2026-11-07' }] });
  fake.rpc.mockImplementation(() => {
    const query = { order: () => query, range: async () => ({ data: [], error: null }) };
    return query;
  });
  fake.from.mockImplementation(() => {
    const query = { select: () => query, eq: () => query, in: () => query, order: () => query,
      range: async () => ({ data: [
        { player_id: 'soon', price_egp: 1000, captain_packages: { price_egp: 1200 } },
        { player_id: 'soon', price_egp: 800, captain_packages: null },
      ], error: null }) };
    return query;
  });
});
it('uses the current package price for upcoming rows and excludes it from the RPC total', async () => {
  const result = await fetchMoneyOwed(now);
  expect(fake.rpc).toHaveBeenCalledWith('captain_money_owed');
  expect(result).toMatchObject({ total: 0, count: 0, rows: [{ playerId: 'soon', amount: 1200, days: 3, reason: 'soon' }] });
});
it('propagates RPC and roster failures instead of displaying an invented zero total', async () => {
  fake.rpc.mockImplementation(() => {
    const query = { order: () => query, range: async () => ({ data: null, error: new Error('RPC unavailable') }) };
    return query;
  });
  await expect(fetchMoneyOwed(now)).rejects.toThrow('RPC unavailable');
  fake.roster.mockResolvedValue({ error: 'Unavailable' });
  await expect(fetchMoneyOwed(now)).rejects.toThrow('Money owed roster unavailable');
});
it('reads all RPC pages so the total never stops at the API row limit', async () => {
  fake.roster.mockResolvedValue({ players: [] });
  const records = Array.from({ length: 500 }, (_, index) => ({
    player_id: String(index), amount_egp: 10, reason: 'expired', since: '2026-11-01',
  }));
  const range = vi.fn().mockResolvedValueOnce({ data: records, error: null })
    .mockResolvedValueOnce({ data: [{ ...records[0], player_id: 'last' }], error: null });
  const query = { order: () => query, range };
  fake.rpc.mockReturnValue(query);
  const result = await fetchMoneyOwed(now);
  expect(range.mock.calls).toEqual([[0, 499], [500, 999]]);
  expect(result.total).toBe(5010);
  expect(result.count).toBe(501);
});
