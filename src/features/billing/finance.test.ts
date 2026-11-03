import { describe, expect, it } from 'vitest';
import { monthChange, previousMonth, remaining, revenueSince, summarizeRevenue } from './finance';

describe('captain finance', () => {
  it('steps back across a year boundary', () => {
    expect(previousMonth('2026-11')).toBe('2026-10');
    expect(previousMonth('2026-01')).toBe('2025-12');
  });
  it('queries from a day before last month starts', () => {
    expect(revenueSince('2026-11-03')).toBe('2026-09-30T00:00:00.000Z');
  });
  it('counts money in the Cairo month it was received', () => {
    const revenue = summarizeRevenue([
      { amount_egp: 1500, created_at: '2026-11-02T09:00:00Z' },
      // 23:30 UTC on Oct 31 is already Nov 1 in Cairo.
      { amount_egp: 500, created_at: '2026-10-31T23:30:00Z' },
      { amount_egp: 800, created_at: '2026-10-15T12:00:00Z' },
      { amount_egp: null, created_at: '2026-10-16T12:00:00Z' },
      { amount_egp: 999, created_at: '2026-09-30T12:00:00Z' },
    ], [{ due_egp: 300 }, { due_egp: 200 }], '2026-11-03');
    expect(revenue).toEqual({ thisMonth: 2000, lastMonth: 800, dues: 500, owing: 2 });
  });
  it('compares with last month only when it had revenue', () => {
    expect(monthChange({ thisMonth: 1500, lastMonth: 1000 })).toBe(50);
    expect(monthChange({ thisMonth: 500, lastMonth: 1000 })).toBe(-50);
    expect(monthChange({ thisMonth: 500, lastMonth: 0 })).toBeNull();
  });
  it('leaves what was not paid of the price', () => {
    expect(remaining(1500, 500)).toBe(1000);
    expect(remaining(1500, null)).toBe(1500);
    expect(remaining(1500, 2000)).toBe(0);
    expect(remaining(null, 500)).toBe(0);
  });
});
