import { expect, it } from 'vitest';
import { iftarCountdown } from './iftar-countdown';
it('uses injected instants and never displays a negative countdown', () => {
  expect(iftarCountdown(10000000, 4940000)).toBe('01:24:20');
  expect(iftarCountdown(10000000, 4941000)).toBe('01:24:19');
  expect(iftarCountdown(10000000, 10000001)).toBe('00:00:00');
});
