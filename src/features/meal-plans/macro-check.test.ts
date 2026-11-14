import { describe, expect, it } from 'vitest';
import { checkMacros, unitKcal } from './macro-check';

describe('macro check', () => {
  it('accepts exact calories and zero values', () => {
    expect(checkMacros({ kcal: 0, protein: 0, carbs: 0, fat: 0 })).toEqual({ calculated: 0, warn: false });
    expect(checkMacros({ kcal: 100, protein: 25, carbs: 0, fat: 0 }).warn).toBe(false);
    expect(checkMacros({ kcal: 210, protein: 10, carbs: 20, fat: 10 })).toEqual({ calculated: 210, warn: false });
    expect(checkMacros({ kcal: 100, protein: 0, carbs: 0, fat: 0 }).warn).toBe(true);
  });
  it('warns only beyond the greater of ten calories and eight percent', () => {
    expect(checkMacros({ kcal: 100, protein: 27.5, carbs: 0, fat: 0 }).warn).toBe(false);
    expect(checkMacros({ kcal: 100, protein: 28, carbs: 0, fat: 0 }).warn).toBe(true);
    expect(checkMacros({ kcal: 500, protein: 115, carbs: 0, fat: 0 }).warn).toBe(false);
    expect(checkMacros({ kcal: 500, protein: 114, carbs: 0, fat: 0 }).warn).toBe(true);
    expect(checkMacros({ kcal: 0, protein: 3, carbs: 0, fat: 0 }).warn).toBe(true);
  });
  it('scales calories to household grams', () => {
    expect(unitKcal(230, 60)).toBe(138);
    expect(unitKcal(0, 60)).toBe(0);
  });
});
