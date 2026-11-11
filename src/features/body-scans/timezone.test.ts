import { expect, it } from 'vitest';
import { alerts } from './deltas';

it('measures an overdue scan on the player day', () => {
  const rows = [{ scan_date: '2026-01-01', weight_kg: 80, muscle_kg: null, fat_pct: null }];
  const now = new Date('2026-01-31T21:30:00Z');
  expect(alerts(rows, now, 'Asia/Dubai').overdue).toBe(true);
  expect(alerts(rows, now, 'America/New_York').overdue).toBe(false);
});
