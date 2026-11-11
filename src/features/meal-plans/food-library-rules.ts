import type { Macros } from '@/lib/macros';

export function kcalMismatch(food: Macros): boolean {
  return Math.abs(4 * food.protein + 4 * food.carbs + 9 * food.fat - food.kcal) > food.kcal * 0.12;
}

export function normalizeFoodName(name: string): string {
  return name.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function duplicateFood(name: string, nameEn: string, foods: { id: string; name: string; nameEn?: string | null }[], id?: string): boolean {
  const names = [name, nameEn].map(normalizeFoodName).filter(Boolean);
  return foods.some(food => food.id !== id && [food.name, food.nameEn ?? '']
    .some(value => names.includes(normalizeFoodName(value))));
}
