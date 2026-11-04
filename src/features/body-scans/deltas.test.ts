import { describe, expect, it } from 'vitest';
import { alerts, latestDelta, totalDelta, trend } from './deltas';

const scan = (scan_date: string, weight_kg: number | null, muscle_kg: number | null, fat_pct: number | null) =>
  ({ scan_date, weight_kg, muscle_kg, fat_pct });
const rows = [scan('2026-09-01', 90, 35, 25), scan('2026-10-01', 88, 36, 23), scan('2026-11-01', 87, 37.5, 22.5)] as const;
describe('scan comparisons', () => {
  it('compares adjacent scans and the endpoints with decimal precision', () => {
    expect(latestDelta(rows)).toEqual({ weight_kg: -1, muscle_kg: 1.5, fat_pct: -0.5 });
    expect(totalDelta(rows)).toEqual({ weight_kg: -3, muscle_kg: 2.5, fat_pct: -2.5 });
    expect(latestDelta([scan('2026-01-01', 70.1, 30.1, 20.1), scan('2026-02-01', 70.2, 30.2, 20.2)]).fat_pct).toBe(0.1);
  });
  it('keeps missing measurements unknown and requires two scans', () => {
    for (const scans of [[], [rows[0]]]) expect(latestDelta(scans)).toEqual({ weight_kg: null, muscle_kg: null, fat_pct: null });
    expect(totalDelta([scan('2026-01-01', null, 30, 20), scan('2026-02-01', 80, null, 19)]))
      .toEqual({ weight_kg: null, muscle_kg: null, fat_pct: -1 });
  });
  it('judges muscle and fat and keeps weight neutral without a goal', () => {
    expect(trend('muscle_kg', 1)).toBe('good');
    expect(trend('muscle_kg', -1)).toBe('bad');
    expect(trend('fat_pct', -1)).toBe('good');
    expect(trend('fat_pct', 1)).toBe('bad');
    expect(trend('weight_kg', -1)).toBe('neutral');
    expect(trend('muscle_kg', null)).toBe('neutral');
    expect(trend('fat_pct', 0)).toBe('neutral');
    expect(trend('weight_kg', -2, { previous: 90, latest: 88, target: 80 })).toBe('good');
    expect(trend('weight_kg', 2, { previous: 70, latest: 72, target: 80 })).toBe('good');
    expect(trend('weight_kg', -4, { previous: 81, latest: 77, target: 80 })).toBe('bad');
  });
});
describe('scan alerts with a Cairo clock', () => {
  it('is overdue only after 30 calendar days, including the Cairo midnight boundary', () => {
    expect(alerts([], new Date('2026-11-01T12:00:00Z')).overdue).toBe(true);
    expect(alerts([rows[1]], new Date('2026-10-31T12:00:00Z')).overdue).toBe(false);
    expect(alerts([rows[1]], new Date('2026-10-31T22:00:00Z')).overdue).toBe(true);
  });
  it('warns on muscle loss together with fat gain, or fat gain of at least one point', () => {
    const first = scan('2026-10-01', 80, 35, 20);
    const now = new Date('2026-11-02T12:00:00Z');
    expect(alerts([first, scan('2026-11-01', 80, 34, 20.1)], now).regressing).toBe(true);
    expect(alerts([first, scan('2026-11-01', 80, 36, 21)], now).regressing).toBe(true);
    expect(alerts([first, scan('2026-11-01', 80, null, 20.9)], now).regressing).toBe(false);
    expect(alerts([first], now).regressing).toBe(false);
    expect(alerts(rows, now).regressing).toBe(false);
  });
});
