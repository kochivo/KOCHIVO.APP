import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { createT } from '@/core/i18n/messages';
import type { messages } from './components/library/messages';
vi.mock('@/core/i18n/client', () => ({ useT: (value: typeof messages) => createT(value, 'en') }));
vi.mock('./data/food-library', () => ({ checkFoodDuplicate: vi.fn(), deleteLibraryFood: vi.fn() }));
vi.mock('./data/custom-food-photo', () => ({ saveCustomFood: vi.fn() }));
import { FoodDrawer } from './components/library/food-drawer';

const food = { id: 'id', name: 'Rice', nameEn: 'Rice', custom: false, kcal: 100, protein: 2, carbs: 20, fat: 1, photo: null, uses: 7 };
it('renders global food fields read-only with copy but no save or delete action', () => {
  const html = renderToStaticMarkup(createElement(FoodDrawer, { food, onClose() {}, onSaved() {} }));
  expect(html).toContain('<fieldset disabled=""');
  expect(html).toContain('Copy to my foods');
  expect(html).not.toContain('type="submit"');
  expect(html).not.toContain('Delete food');
});
it('disables deleting a used own food and explains the count', () => {
  const html = renderToStaticMarkup(createElement(FoodDrawer, { food: { ...food, custom: true }, onClose() {}, onSaved() {} }));
  expect(html).toContain('used 7 times in plans');
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Delete food/);
});
