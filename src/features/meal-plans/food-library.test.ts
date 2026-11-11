import { expect, it } from 'vitest';
import { duplicateFood, kcalMismatch, normalizeFoodName } from './food-library-rules';

it('allows a 12 percent energy difference and warns beyond it', () => {
  expect(kcalMismatch({ kcal: 100, protein: 22, carbs: 0, fat: 0 })).toBe(false);
  expect(kcalMismatch({ kcal: 100, protein: 21.9, carbs: 0, fat: 0 })).toBe(true);
  expect(kcalMismatch({ kcal: 0, protein: 0, carbs: 0, fat: 0 })).toBe(false);
  expect(kcalMismatch({ kcal: 0, protein: 1, carbs: 0, fat: 0 })).toBe(true);
});
it('normalizes alef forms, taa marbuta, tatweel and diacritics', () => {
  expect(normalizeFoodName('  إِأآةـ  ')).toBe('اااه');
});
it('detects duplicates in either language and excludes the edited row', () => {
  const foods = [{ id: 'a', name: 'جُبنة', nameEn: 'Cheese' }];
  expect(duplicateFood('جبنه', '', foods)).toBe(true);
  expect(duplicateFood('جديد', ' cheese ', foods)).toBe(true);
  expect(duplicateFood('جبنة', '', foods, 'a')).toBe(false);
  expect(duplicateFood('', '', foods)).toBe(false);
});
