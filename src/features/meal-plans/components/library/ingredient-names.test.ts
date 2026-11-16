import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { Food } from '../../types';
import { FoodFacts } from './food-facts';

const description = 'Rice, white, long-grain, regular, enriched, cooked';
const food: Food = { id: 'rice', name: 'أرز', custom: false, photo: null, kcal: 130, protein: 3, carbs: 28, fat: 0 };
const ingredient = { fdc_id: '168878', grams: 150, description, diet_tags: ['plant' as const] };
function render(value: Food, locale: 'ar' | 'en', style: 'egyptian' | 'standard' = 'egyptian') {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale, style }, createElement(FoodFacts, { food: value })));
}

it('covers every seed ingredient with Arabic and English names', async () => {
  const { ingredientNames } = await import('../../data/ingredient-names');
  const foods: { source_ref: { ingredients?: { fdc_id: string }[] } }[] = JSON.parse(
    readFileSync('supabase/seed/source/foods-starter.json', 'utf8'));
  for (const food of foods) for (const item of food.source_ref.ingredients ?? []) {
    expect(ingredientNames[item.fdc_id]?.ar.trim(), item.fdc_id).toBeTruthy();
    expect(ingredientNames[item.fdc_id]?.en.trim(), item.fdc_id).toBeTruthy();
  }
});

it('renders localized recipe ingredients in both Arabic styles and English', () => {
  const recipe: Food = { ...food, source_kind: 'recipe', source_ref: { ingredients: [ingredient], cooked_yield_g: 150 } };
  for (const style of ['egyptian', 'standard'] as const) {
    const html = render(recipe, 'ar', style);
    expect(html).toContain('أرز أبيض مطبوخ');
    expect(html).not.toContain(description);
  }
  expect(render(recipe, 'en')).toContain('White rice, cooked');
});

it('preserves captain names and unknown ingredient descriptions', () => {
  const captainIngredient = { ...ingredient, food_id: 'captain-rice', description: 'رز الكابتن' };
  const recipe: Food = { ...food, source_kind: 'recipe', source_ref: { ingredients: [
    captainIngredient,
    { ...ingredient, fdc_id: 'unknown', description: 'Unknown ingredient' },
  ], cooked_yield_g: 300 } };
  for (const locale of ['ar', 'en'] as const) {
    const html = render(recipe, locale);
    expect(html).toContain('رز الكابتن');
    expect(html).toContain('Unknown ingredient');
  }
});

it('hides USDA descriptions only in Arabic and retains source identifiers', () => {
  const source: Food = { ...food, source_kind: 'usda', source_ref: { fdc_id: '168878', dataset: 'SR Legacy', description } };
  expect(render(source, 'ar')).not.toContain(description);
  expect(render(source, 'ar')).toContain('dir="ltr">168878 · SR Legacy');
  expect(render(source, 'en')).toContain(description);
});
