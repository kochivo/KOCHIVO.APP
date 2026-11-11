import { expect, it } from 'vitest';
import { KochivoDB } from '@/core/offline';
import { toggleTodaySupplement } from './data/log-supplement';
import { supplementAdherence } from './model';

it('logs a player day and measures that day in the captain view', async () => {
  const db = new KochivoDB('supplement-timezone');
  const now = Date.parse('2026-01-01T21:30:00Z');
  try {
    expect(await toggleTodaySupplement(db, 'supplement', now, 'Asia/Dubai')).toBe('2026-01-02');
    const logs = await db.supplement_logs.toArray();
    expect(supplementAdherence(logs, [{ id: 'supplement' }], 1, now, 'Asia/Dubai')).toBe(1);
    expect(supplementAdherence(logs, [{ id: 'supplement' }], 1, now, 'America/New_York')).toBe(0);
  } finally { await db.delete(); }
});
