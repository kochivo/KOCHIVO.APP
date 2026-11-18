import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { ShoppingWeekList } from './components/shopping-week-list';
import { shoppingItems } from './shopping-items';
import type { NutritionMeal } from '@/core/offline';

vi.mock('server-only', () => ({}));

it('keeps every ingredient without prices and orders the aisle groups', () => {
  const chicken = { id: 'chicken', seed_key: 'chicken-breast', name_ar: 'فراخ', name_en: 'Chicken', kcal_per_100g: 120, protein_per_100g: 20 };
  const tomato = { ...chicken, id: 'tomato', seed_key: 'tomato', name_ar: 'طماطم', name_en: 'Tomato' };
  const meal: NutritionMeal = { id: 'meal', name: 'Lunch', position: 1,
    items: [tomato, chicken].map(food => ({
      id: food.id, name: food.name_ar, position: 1, grams: 120, photo_path: null, alternatives: [],
      per100g: { kcal: 120, protein: 20, carbs: 0, fat: 0 },
    })),
  };
  const list = shoppingItems([], [[meal], [meal]], [chicken, tomato], false, true);
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(ShoppingWeekList, list)));
  expect(html.match(/data-shopping-section="[^"]+"/g)).toEqual(['data-shopping-section="protein"', 'data-shopping-section="produce"']);
  expect(html.match(/type="checkbox"/g)).toHaveLength(2);
  expect(html.match(/240 g/g)).toHaveLength(2);
  const priced = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(ShoppingWeekList, { ...list, total: 30, hasEstimate: true })));
  expect(priced.match(/data-shopping-section="[^"]+"/g)?.at(-1)).toBe('data-shopping-section="cost"');
});
