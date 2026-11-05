import { describe, expect, it } from 'vitest';
import { daysBetween, localDate } from './dates';
import { equivalentGrams, macrosFor, sumMacros } from './macros';

describe('localDate', () => {
  it('uses Cairo time, not UTC, around midnight', () => {
    // 23:30 UTC on Nov 2 is already Nov 3 in Cairo (UTC+2 in winter).
    expect(localDate(new Date('2026-11-02T23:30:00Z'))).toBe('2026-11-03');
    expect(localDate(new Date('2026-11-02T21:30:00Z'))).toBe('2026-11-02');
  });
});

describe('daysBetween', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-11-01', '2026-11-04')).toBe(3);
    expect(daysBetween('2026-11-04', '2026-11-01')).toBe(-3);
  });
});

describe('macros', () => {
  const rice = { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3 };
  const pasta = { kcal: 158, protein: 5.8, carbs: 30.9, fat: 0.9 };

  it('scales per-100g values to grams', () => {
    expect(macrosFor(rice, 250)).toEqual({ kcal: 325, protein: 6.8, carbs: 70.5, fat: 0.8 });
  });

  it('sums meals', () => {
    expect(sumMacros([macrosFor(rice, 100), macrosFor(rice, 100)]).kcal).toBe(260);
  });

  it('finds calorie-equivalent grams rounded to 5g', () => {
    expect(equivalentGrams(rice, 250, pasta)).toBe(205);
  });
});
