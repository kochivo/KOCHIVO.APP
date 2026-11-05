import { describe, expect, it } from 'vitest';
import { ageIn, parseTab, pickedLabels, trainingDayKeys, weightPoints, weightSummary } from './model';

describe('player profile model', () => {
  it('falls back to the intake tab for unknown or repeated params', () => {
    expect(parseTab('progress')).toBe('progress');
    expect(parseTab('analysis')).toBe('analysis');
    expect(parseTab('billing')).toBe('intake');
    expect(parseTab(['plan', 'checkins'])).toBe('intake');
    expect(parseTab(undefined)).toBe('intake');
  });
  it('lists training days from Saturday like the Egyptian week', () => {
    expect(trainingDayKeys([0, 6, 3])).toEqual(['saturday', 'sunday', 'wednesday']);
  });
  it('builds an oldest-first weight trend and skips weeks without a weight', () => {
    const points = weightPoints([
      { weekStart: '2026-10-31', weightKg: 82.4 }, { weekStart: '2026-10-24', weightKg: null }, { weekStart: '2026-10-17', weightKg: 84 },
    ]);
    expect(points).toEqual([{ date: '2026-10-17', value: 84 }, { date: '2026-10-31', value: 82.4 }]);
    expect(weightSummary(points, 78)).toEqual({ latest: 82.4, change: -1.6, toTarget: -4.4 });
    expect(weightSummary(points, null)?.toTarget).toBeNull();
    expect(weightSummary([], 78)).toBeNull();
  });
  it('labels picked chips without the none placeholder', () => {
    const options = [{ key: 'none', label: 'none' }, { key: 'lower_back', label: 'lowerBack' }] as const;
    expect(pickedLabels(['none'], options)).toEqual([]);
    expect(pickedLabels(['lower_back', 'unknown'], options)).toEqual(['lowerBack']);
  });
  it('computes age from the birth year', () => {
    expect(ageIn(1995, '2026-11-03')).toBe(31);
  });
});
