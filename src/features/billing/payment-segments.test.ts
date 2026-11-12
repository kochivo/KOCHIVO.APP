import { expect, it } from 'vitest';
import { paymentSegment, segmentCounts } from './workspace';

const today = '2026-11-12';
const paid = { accessUntil: '2026-12-12', due: 0 };
it('counts each player once, including waiting and frozen players in all only', () => {
  const players = [paid, { ...paid, due: 100 }, { ...paid, accessUntil: '2026-11-11' },
    { ...paid, accessUntil: today }, { ...paid, accessUntil: '2026-11-19' },
    { ...paid, pending: true }, { ...paid, frozenAt: '2026-11-01' }];
  expect(segmentCounts(players, today)).toEqual({ all: 7, overdue: 2, ending: 2, paid: 1 });
});
it('treats exhausted sessions as ending and unpaid installments as overdue', () => {
  expect(paymentSegment({ ...paid, sessionsLeft: 0 }, today)).toBe('ending');
  expect(paymentSegment({ ...paid, sessionsLeft: 5, due: 100 }, today)).toBe('overdue');
  expect(paymentSegment({ ...paid, sessionsLeft: 5 }, today)).toBe('paid');
});
