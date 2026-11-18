import { expect, it } from 'vitest';
import { expectedIncome, subscriptionTiles, paymentRows, paymentFilters, paymentMatches } from './workspace-billing-summary';
import type { BillingPlayer } from '../types';

it('counts PT as active only with remaining sessions and unexpired validity', () => {
  const today = '2026-11-16';
  const players = [
    { accessUntil: '2026-11-15', sessionsLeft: 4 },
    { accessUntil: today, sessionsLeft: 1 },
    { accessUntil: '2026-11-17', sessionsLeft: 0 },
    { accessUntil: '2026-11-17', sessionsLeft: 4 },
    { accessUntil: today, sessionsLeft: null },
  ];
  expect(subscriptionTiles(players, today, 0, 0).active).toBe(3);
});

it('counts balance, missing package, ending and paid independently', () => {
  const today = '2026-11-16';
  const player: BillingPlayer = { playerId: 'p', fullName: 'Ali', accessUntil: '2026-11-18', status: 'active',
    phone: null, lastPayment: null, due: 0, startedOn: today, lastTrainingDate: null, programTitle: null, openTasks: 0 };
  const lastPayment = { id: 'payment', captain_id: 'captain', player_id: 'p', period_start: today, period_end: '2026-11-18',
    package_id: 'package', days: 30, price_egp: 900, amount_egp: 200, collected_egp: 200, created_at: '2026-11-16T12:00:00Z' };
  const rows = paymentRows([
    player, { ...player, lastPayment, due: 500 },
    { ...player, lastPayment: { ...lastPayment, amount_egp: 700 } },
  ], [], today);
  expect(Object.fromEntries(paymentFilters.map(filter => [filter, rows.filter(row => paymentMatches(row, filter)).length])))
    .toEqual({ all: 3, overdue: 1, noPackage: 1, ending: 3, paid: 1 });
  expect(rows.map(row => row.action)).toEqual(['collect', 'history', 'renew']);
  expect(rows[0]).toMatchObject({ paid: 400, total: 900, fullyPaid: false });
  expect(expectedIncome(rows, 1100, today, 'Africa/Cairo')).toBe(1600);
  expect(expectedIncome(rows, 1100, '2026-12-01', 'Africa/Cairo')).toBe(1100);
});
