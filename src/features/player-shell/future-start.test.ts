import { expect, it } from 'vitest';
import { subscriptionNotStarted } from './access';

it('blocks only before a non-null effective start, including while awaiting plans', () => {
  expect(subscriptionNotStarted('2026-11-10', '2026-11-03')).toBe(true);
  expect(subscriptionNotStarted('2026-11-03', '2026-11-03')).toBe(false);
  expect(subscriptionNotStarted('2026-11-02', '2026-11-03')).toBe(false);
  expect(subscriptionNotStarted(null, '2026-11-03')).toBe(false);
  expect(subscriptionNotStarted(undefined, '2026-11-03')).toBe(false);
});
