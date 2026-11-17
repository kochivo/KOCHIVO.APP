import { expect, it } from 'vitest';
import { adjustRestDeadline } from './rest';
import { describePainQueue, painFinishHeadline } from './pain-stop';

it('adjusts the remaining deadline by 15 seconds and clamps at now', () => {
  expect(adjustRestDeadline(40_250, 10_000, 15)).toBe(55_250);
  expect(adjustRestDeadline(40_250, 10_000, -15)).toBe(25_250);
  expect(adjustRestDeadline(24_000, 10_000, -15)).toBe(10_000);
  expect(adjustRestDeadline(null, 10_000, 15)).toBeNull();
  expect(adjustRestDeadline(9_999, 10_000, 15)).toBe(9_999);
});

it('labels only the remaining exercises and keeps their queue order', () => {
  const names = new Map([['done', 'Completed'], ['press', 'Leg press'], ['row', 'Cable row']]);
  expect(describePainQueue(['press', 'row'], ['press'], names)).toEqual([
    { id: 'press', name: 'Leg press', removed: true }, { id: 'row', name: 'Cable row', removed: false },
  ]);
});

it('chooses the regular, stopped, or safe-exercises finish headline', () => {
  expect(painFinishHeadline(0, 3)).toBeNull();
  expect(painFinishHeadline(2, 0)).toBe('finishStopped');
  expect(painFinishHeadline(2, 3)).toBe('finishSafe');
});
