import { expect, it } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { toggleTodaySupplement } from './data/log-supplement';
import { supplementAdherence } from './model';

it('counts today as the only eligible day for a newly assigned supplement', () => {
  const now = Date.parse('2026-11-04T22:30:00Z');
  const logs = ['2026-11-04', '2026-11-05'].map(log_date => ({
    supplement_id: 'supplement', log_date, taken_at: '2026-11-04T22:25:00Z',
  }));
  const rows = [{ id: 'supplement', created_at: '2026-11-04T21:00:00Z' }];
  expect(supplementAdherence(logs, rows, 7, now, 'Asia/Dubai')).toBe(1);
});

it('logs a player day and measures that day in the captain view', async () => {
  const db = new KochivoDB('supplement-timezone');
  const now = Date.parse('2026-01-01T21:30:00Z');
  const rows = [{ id: 'supplement', created_at: '2025-12-31T00:00:00Z' }];
  try {
    expect(await toggleTodaySupplement(db, 'supplement', now, 'Asia/Dubai')).toBe('2026-01-02');
    const logs = await db.supplement_logs.toArray();
    expect(supplementAdherence(logs, rows, 1, now, 'Asia/Dubai')).toBe(1);
    expect(supplementAdherence(logs, rows, 1, now, 'America/New_York')).toBe(0);
  } finally { await db.delete(); }
});
