import { expect, it } from 'vitest';
import { dailyAverages } from './triage';

it('includes today in the player timezone when the captain is still on yesterday', () => {
  const rows = [{ player_id: 'p', log_date: '2026-01-02', sleep_hours: 8, soreness: 1, deleted_at: null }];
  const now = new Date('2026-01-01T21:30:00Z');
  expect(dailyAverages('p', rows, now, 'Asia/Dubai').count).toBe(1);
  expect(dailyAverages('p', rows, now, 'America/New_York').count).toBe(0);
});
