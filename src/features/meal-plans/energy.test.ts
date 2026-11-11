import { describe, expect, it } from 'vitest';
import { activityFactor, bmr, calculateEnergy, cycle, macros, targetKcal } from './energy';

const body = { weightKg: 82, heightCm: 178, age: 27, sex: 'male' as const };
describe('energy calculations', () => {
  it('rounds Mifflin-St Jeor only at the output', () => {
    expect(bmr(body)).toBe(1803);
    expect(bmr({ ...body, sex: 'female' })).toBe(1637);
  });
  it('uses Katch-McArdle when body fat is supplied, including zero', () => {
    expect(bmr({ ...body, bodyFatPct: 20 })).toBe(1787);
    expect(bmr({ ...body, bodyFatPct: 0 })).toBe(2141);
  });
  it.each([[0, 1.2], [1, 1.2], [2, 1.375], [3, 1.375], [4, 1.55], [5, 1.55], [6, 1.725], [7, 1.725]])(
    'uses the documented activity band for %i days', (days, factor) => {
      expect(activityFactor(days, 74)).toBe(factor);
      expect(activityFactor(days, 75)).toBeCloseTo(factor + .05);
    },
  );
  it('uses 7700 kcal/kg, preserves maintenance and clamps cuts at BMR', () => {
    expect(targetKcal(2793.875, 'cut', .5, 1802.5)).toBe(2244);
    expect(targetKcal(2793.875, 'bulk', .5, 1802.5)).toBe(3344);
    expect(targetKcal(2793.875, 'maintain', .5, 1802.5)).toBe(2794);
    expect(targetKcal(2793.875, 'cut', 3, 1802.5)).toBe(1803);
  });
  it('matches the corrected full fixture without intermediate BMR rounding', () => {
    const result = calculateEnergy(body, 4, 60, 'cut', .5);
    expect(result).toEqual({ bmr: 1803, tdee: 2794, target: 2244 });
    expect(macros(result.target, 82).grams).toEqual({ protein: 164, fat: 62, carbs: 258 });
  });
  it('returns gram-based macro percentages and supports overrides', () => {
    const result = macros(2244, 82);
    expect(result.percentages.protein).toBeCloseTo(656 / 2244 * 100);
    expect(result.percentages.fat).toBeCloseTo(558 / 2244 * 100);
    expect(result.percentages.carbs).toBeCloseTo(1032 / 2244 * 100);
    expect(macros(2000, 80, { proteinGPerKg: 1.5, fatPct: 30 }).grams)
      .toEqual({ protein: 120, fat: 67, carbs: 229 });
  });
  it('balances the weekly cycle within the final rounding tolerance', () => {
    expect(cycle(2244, 4)).toEqual({ training: 2420, rest: 2010 });
    for (let days = 1; days < 7; days++) {
      const split = cycle(2244, days);
      expect(Math.abs((split.training * days + split.rest * (7 - days)) / 7 - 2244)).toBeLessThanOrEqual(5);
    }
    expect(cycle(2244, 0)).toEqual({ training: 2240, rest: 2240 });
    expect(cycle(2244, 7)).toEqual({ training: 2240, rest: 2240 });
  });
  it('rejects invalid inputs and impossible macro allocations', () => {
    expect(() => bmr({ ...body, weightKg: NaN })).toThrow(RangeError);
    expect(() => bmr({ ...body, bodyFatPct: 100 })).toThrow(RangeError);
    expect(() => activityFactor(8, 60)).toThrow(RangeError);
    expect(() => cycle(2244, 2.5)).toThrow(RangeError);
    expect(() => targetKcal(2000, 'cut', -1, 1500)).toThrow(RangeError);
    expect(() => macros(500, 82)).toThrow(RangeError);
  });
});
