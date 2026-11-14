import type { Macros } from '@/lib/macros';

export function checkMacros({ kcal, protein, carbs, fat }: Macros) {
  const calculated = protein * 4 + carbs * 4 + fat * 9;
  return { calculated, warn: Math.abs(calculated - kcal) > Math.max(kcal * 0.08, 10) };
}

export function unitKcal(kcal: number, grams: number) {
  return kcal * grams / 100;
}

