import { describe, expect, it } from 'vitest';
import { expiringSoon, subscriptionTiles } from './components/workspace-billing-summary';

const today = '2026-11-14';
const base = { accessUntil: today, pending: false, frozenAt: null, sessionsLeft: null };
describe('v11 billing numbers', () => {
  it('uses received revenue and request count, excluding inactive subscriptions', () => {
    const players = [base, { ...base, accessUntil: '2026-11-21' },
      { ...base, accessUntil: '2026-11-22' }, { ...base, accessUntil: '2026-11-13' },
      { ...base, pending: true }, { ...base, frozenAt: today },
      { ...base, sessionsLeft: 0 }, { ...base, sessionsLeft: 3, accessUntil: '2026-11-13' }];
    expect(subscriptionTiles(players, today, 12400, 2)).toEqual({ income: 12400, pending: 2, ending: 2, active: 4 });
  });
  it('includes today through day 30 for reminders, excluding expired and session packages', () => {
    const players = [base, { ...base, accessUntil: '2026-12-14' },
      { ...base, accessUntil: '2026-12-15' }, { ...base, accessUntil: '2026-11-13' },
      { ...base, pending: true }, { ...base, frozenAt: today }, { ...base, sessionsLeft: 1 }];
    expect(expiringSoon(players, today).map(row => row.accessUntil)).toEqual([today, '2026-12-14']);
  });
});
