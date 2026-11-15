import { describe, expect, it } from 'vitest';
import { billingState, endingThisWeek } from './workspace';
import { summarizeRevenue } from './finance';
import { expiringSoon, subscriptionTiles } from './components/workspace-billing-summary';

describe('billing state actions', () => {
  const base = { accessUntil: '2026-11-20', due: 0, pending: false, frozenAt: null, sessionsLeft: null };
  it('maps active, ending, overdue, frozen, pending and exhausted sessions', () => {
    expect(billingState(base, '2026-11-12')).toMatchObject({ label: 'active', action: 'renew' });
    expect(billingState({ ...base, accessUntil: '2026-11-15' }, '2026-11-12')).toMatchObject({ label: 'ending', days: 3, action: 'remind' });
    expect(billingState({ ...base, accessUntil: '2026-11-08' }, '2026-11-12')).toMatchObject({ label: 'overdue', days: 4, action: 'record' });
    expect(billingState({ ...base, due: 10 }, '2026-11-12').action).toBe('record');
    expect(billingState({ ...base, frozenAt: '2026-11-01' }, '2026-11-12')).toMatchObject({ label: 'frozen', action: 'unfreeze' });
    expect(billingState({ ...base, pending: true }, '2026-11-12').action).toBe('activate');
    expect(billingState({ ...base, sessionsLeft: 0 }, '2026-11-12').action).toBe('renew');
  });
  it('counts inclusive next seven days, excluding pending/frozen/session-only players', () => {
    expect(endingThisWeek([0, 7, 8, -1].map(n => ({ ...base, accessUntil: `2026-11-${String(12 + n).padStart(2, '0')}` })), '2026-11-12')).toBe(2);
    expect(endingThisWeek([{ ...base, accessUntil: '2026-11-13', frozenAt: 'frozen' }, { ...base, pending: true }, { ...base, sessionsLeft: 2 }], '2026-11-12')).toBe(0);
  });
  it('does not classify awaiting plans as ending or overdue', () => {
    const player = { ...base, awaitingPlansAt: '2026-11-01T10:00:00Z' };
    expect(billingState(player, '2026-12-01')).toMatchObject({ label: 'waitingForPlans', days: 0 });
    expect(endingThisWeek([player], '2026-11-15')).toBe(0);
    expect(expiringSoon([player], '2026-11-17')).toEqual([]);
    expect(subscriptionTiles([player], '2026-11-17', 0, 0)).toMatchObject({ ending: 0, active: 0 });
  });
});
it('sums received money in the captain timezone across month boundaries', () => {
  const money = [{ created_at: '2026-10-31T22:30:00Z', amount_egp: 500 }, { created_at: '2026-11-01T02:00:00Z', amount_egp: 250 }];
  expect(summarizeRevenue(money, [], '2026-11-12', 'Africa/Cairo')).toMatchObject({ thisMonth: 750, lastMonth: 0 });
  expect(summarizeRevenue(money, [], '2026-11-12', 'America/New_York')).toMatchObject({ thisMonth: 0, lastMonth: 750 });
});
