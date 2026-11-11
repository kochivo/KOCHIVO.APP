import { expect, it } from 'vitest';
import { summarizeRevenue } from './finance';

it('assigns a payment to the captain month at a month boundary', () => {
  const rows = [{ created_at: '2026-02-01T02:00:00Z', amount_egp: 100 }];
  expect(summarizeRevenue(rows, [], '2026-02-01', 'Asia/Dubai').thisMonth).toBe(100);
  expect(summarizeRevenue(rows, [], '2026-02-01', 'America/New_York').lastMonth).toBe(100);
});
