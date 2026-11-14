import { expect, it } from 'vitest';
import { buildMoneyOwed } from './money-owed-model';

const now = new Date('2026-11-03T23:30:00Z');
const players = [
  { playerId: 'expired', fullName: 'A', accessUntil: '2026-10-30' },
  { playerId: 'unknown', fullName: 'B', accessUntil: '2026-11-01' },
  { playerId: 'soon', fullName: 'C', accessUntil: '2026-11-07' },
  { playerId: 'later', fullName: 'D', accessUntil: '2026-11-08' },
];
it('sums only RPC amounts, counts unpriced rows, and uses captain-local days', () => {
  const result = buildMoneyOwed([
    { player_id: 'expired', amount_egp: 1200, reason: 'expired', since: '2026-10-30' },
    { player_id: 'unknown', amount_egp: null, reason: 'expired', since: '2026-11-01' },
  ], players, new Map([['soon', 900]]), now, 'Africa/Cairo');
  expect(result.total).toBe(1200);
  expect(result.count).toBe(2);
  expect(result.unpriced).toBe(1);
  expect(result.rows.map(row => [row.playerId, row.reason, row.days, row.amount])).toEqual([
    ['expired', 'expired', 5, 1200], ['unknown', 'expired', 3, null], ['soon', 'soon', 3, 900],
  ]);
});
it('includes today through day three, excludes pending players and duplicate upcoming rows', () => {
  const result = buildMoneyOwed([
    { player_id: 'soon', amount_egp: 800, reason: 'receipt_pending', since: '2026-11-03' },
  ], [...players, { playerId: 'today', fullName: 'E', accessUntil: '2026-11-04' },
    { playerId: 'pending', fullName: 'F', accessUntil: '2026-11-05', pending: true }], new Map(), now, 'Africa/Cairo');
  expect(result.rows.map(row => row.playerId)).toEqual(['soon', 'today']);
  expect(result.rows[1]).toMatchObject({ reason: 'soon', days: 0, amount: null });
  expect(result.total).toBe(800);
});
it('returns an empty list and exact zero total when nobody owes or expires soon', () => {
  expect(buildMoneyOwed([], [], new Map(), now, 'Africa/Cairo')).toMatchObject({ total: 0, count: 0, rows: [], unpriced: 0 });
});
