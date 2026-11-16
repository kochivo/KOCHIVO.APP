import { macrosFor } from '@/lib/macros';
import type { Macros } from '@/lib/macros';
import type { Food } from '../../types';

export type RegionFilter = 'all' | 'eg' | 'gulf' | 'lev' | 'na' | 'intl' | 'mine' | 'favorites';
export type NutritionFilter = 'protein' | 'fat' | 'carbs' | 'kcal';
export const regions: RegionFilter[] = ['all', 'eg', 'gulf', 'lev', 'na', 'intl', 'mine', 'favorites'];
export const nutrients: NutritionFilter[] = ['protein', 'fat', 'carbs', 'kcal'];
export function normalizeSearch(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/فراخ/g, 'دجاج').replace(/عيش/g, 'خبز').replace(/لحمه/g, 'لحم').trim();
}
export function matchesFood(food: Food, query: string) {
  const name = normalizeSearch(`${food.name} ${food.nameEn ?? ''}`);
  return normalizeSearch(query).split(/\s+/).every(word => name.includes(word));
}
export function filterFoods(foods: Food[], query: string, region: RegionFilter, nutrition: NutritionFilter[], favorites: Set<string>) {
  return foods.filter(food => matchesFood(food, query) &&
    (region === 'all' || (region === 'mine' ? food.custom : region === 'favorites' ? favorites.has(food.id) : (food.region ?? 'intl') === region)) &&
    nutrition.every(key => key === 'protein' ? food.protein >= 15 : food[key] <= ({ fat: 5, carbs: 10, kcal: 120 })[key]));
}
export function foodStatus(food: Food) {
  const source = food.source_ref;
  if (!source) return 'captain';
  if (food.source_kind === 'recipe' && 'ingredients' in source) return 'recipe';
  if ((food.source_kind === 'usda' || food.source_kind === 'proxy') && 'fdc_id' in source && source.fdc_id && source.dataset) return food.source_kind;
  return 'captain';
}
export interface Ingredient { food: Food; grams: number }
export function recipeNutrition(ingredients: Ingredient[], cookedWeight: number) {
  if (!Number.isFinite(cookedWeight) || cookedWeight <= 0 || ingredients.some(item => !Number.isFinite(item.grams) || item.grams <= 0)) throw new Error('Invalid recipe weight');
  const total = ingredients.reduce<Macros>((sum, item) => {
    const portion = macrosFor(item.food, item.grams);
    return { kcal: sum.kcal + portion.kcal, protein: sum.protein + portion.protein, carbs: sum.carbs + portion.carbs, fat: sum.fat + portion.fat };
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const per100 = macrosFor(total, 10000 / cookedWeight);
  return { total, per100, plates: [250, 350, 450].map(grams => ({ grams, ...macrosFor(per100, grams) })) };
}
