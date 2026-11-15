import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { MealCard } from './meal-card';

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('./food-search', () => ({ FoodSearch: () => null }));
vi.mock('./food-row', () => ({ FoodRow: () => null }));

it('renders the existing meal name as a labelled editable field and retains the empty-food state', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(MealCard, {
    meal: { id: 'meal', name: 'Breakfast', position: 0, items: [] }, facts: {}, day: 'training',
    first: true, last: true, editableName: true, update: () => {},
  })));
  expect(html).toContain('Meal name');
  expect(html).toContain('value="Breakfast"');
  expect(html).toContain('type="text"');
  expect(html).toContain('lucide-pencil');
  expect(html).toContain('Add the first food');
  expect(html).toContain('aria-expanded="false"');
});

it('keeps the heading for callers outside the player workspace', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(MealCard, {
    meal: { id: 'meal', name: 'Breakfast', position: 0, items: [] }, facts: {}, day: 'training',
    first: true, last: true, update: () => {},
  })));
  expect(html).toContain('>Breakfast</h2>');
  expect(html).not.toContain('type="text"');
});
