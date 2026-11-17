import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { Food } from '../../types';
import { FoodFacts } from './food-facts';
import { FoodBadge } from './food-badge';
import { FoodResults } from './food-results';
const food: Food = { id: '1', name: 'دجاج', nameEn: 'Chicken', custom: false, photo: null, kcal: 120, protein: 15, carbs: 10, fat: 5 };
const render = (node: ReturnType<typeof createElement>, locale: 'ar' | 'en' = 'en') => renderToStaticMarkup(createElement(LocaleProvider, { locale }, node));
it('renders nullable facts honestly and a live calculator with translated controls', () => {
  const html = render(createElement(FoodFacts, { food: { ...food, fiber_per_100g: null, sugar_per_100g: 0, sodium_mg_per_100g: 25 }, onAdd() {} }));
  expect(html).toContain('Not in our source yet');
  expect(html).toContain('Fiber'); expect(html).toContain('Sodium (mg)');
  expect(html).toContain('Chicken'); expect(html).toContain('Decrease by 10 grams'); expect(html).toContain('Add to plan');
  expect(render(createElement(FoodFacts, { food }), 'ar')).toContain('مش في مصدرنا لسه');
});
it('renders the four provenance badges and refuses unproven verification', () => {
  const ref = { fdc_id: '123', dataset: 'Foundation', description: 'Closest chicken' };
  for (const [kind, label] of [['usda', 'Verified USDA'], ['recipe', 'Recipe'], ['proxy', 'Closest match']] as const) {
    expect(render(createElement(FoodBadge, { food: { ...food, source_kind: kind, source_ref: kind === 'recipe' ? { ingredients: [], cooked_yield_g: 100 } : ref } }))).toContain(label);
  }
  expect(render(createElement(FoodBadge, { food: { ...food, source_kind: 'usda' } }))).toContain('Captain');
});
it('renders recipe ingredients and source confidence', () => {
  const html = render(createElement(FoodFacts, { food: { ...food, source_kind: 'recipe', source_ref: {
    ingredients: [{ fdc_id: '1', grams: 150, description: 'Chicken', diet_tags: ['poultry'] }], cooked_yield_g: 120,
  } } }));
  expect(html).toContain('Ingredients'); expect(html).toContain('150'); expect(html).toContain('Calculated from ingredients and cooked weight');
});
it('distinguishes an empty library from no filter results', () => {
  const props = { foods: [], cards: false, favorites: new Set<string>(), onSelect() {}, onAdd() {}, onFavorite() {} };
  expect(render(createElement(FoodResults, { ...props, empty: true }))).toContain('Your library is empty');
  expect(render(createElement(FoodResults, { ...props, empty: false }))).toContain('No foods match these filters');
});
it('renders the food macros with their distinct tones and keeps row actions available', () => {
  const html = render(createElement(FoodResults, {
    foods: [{ ...food, uses: 0 }], cards: false, favorites: new Set<string>(), empty: false,
    onSelect() {}, onAdd() {}, onFavorite() {},
  }));
  expect(html).toMatch(/text-lime[^>]*>.*15/);
  expect(html).toMatch(/text-info[^>]*>.*10/);
  expect(html).toMatch(/text-warn[^>]*>.*5/);
  expect(html).toContain('Add to plan');
});
it('shows nutrition for the listed portion without changing the catalog values', () => {
  const entry = { ...food, uses: 0, units: [{ key: 'half', name_ar: 'نص طبق', name_en: 'Half plate', grams: 50 }] };
  const html = render(createElement(FoodResults, {
    foods: [entry], cards: false, favorites: new Set<string>(), empty: false,
    onSelect() {}, onAdd() {}, onFavorite() {},
  }), 'ar');
  expect(html).toContain('نص طبق · 50 جم');
  expect(html).toContain('</span>60</td>');
  expect(html).toContain('</span>7.5</td>');
  expect(entry.kcal).toBe(120);
});
