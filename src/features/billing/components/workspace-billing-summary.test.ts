import { expect, it } from 'vitest';
import { subscriptionTiles } from './workspace-billing-summary';

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
