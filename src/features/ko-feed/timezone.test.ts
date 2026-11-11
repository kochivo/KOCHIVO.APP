import { expect, it } from 'vitest';
import { digestYesterday } from './data/load-digest-extras';

it('uses the captain yesterday across a local midnight', () => {
  const now = new Date('2026-01-01T21:30:00Z');
  expect(digestYesterday(now, 'Asia/Dubai')).toBe('2026-01-01');
  expect(digestYesterday(now, 'America/New_York')).toBe('2025-12-31');
});
