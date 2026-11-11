import { expect, it } from 'vitest';
import { currentMonth, canGoNext } from './months';

it('enables the new month on the captain day', () => {
  const now = new Date('2026-02-01T00:00:00Z');
  expect(currentMonth(now, 'Asia/Dubai')).toBe('2026-02-01');
  expect(currentMonth(now, 'America/New_York')).toBe('2026-01-01');
  expect(canGoNext('2026-01-01', now, 'Asia/Dubai')).toBe(true);
  expect(canGoNext('2026-01-01', now, 'America/New_York')).toBe(false);
});
