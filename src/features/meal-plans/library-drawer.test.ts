import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type * as React from 'react';
import { createT } from '@/core/i18n/messages';
import type { messages } from './components/library/messages';
const mocks = vi.hoisted(() => ({ push: vi.fn(), effects: [] as (() => void)[] }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useEffect: (effect: () => void) => { mocks.effects.push(effect); },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (value: typeof messages) => createT(value, 'en') }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('./data/food-library', () => ({ checkFoodDuplicate: vi.fn(), deleteLibraryFood: vi.fn() }));
vi.mock('./data/custom-food-photo', () => ({ saveCustomFood: vi.fn() }));
import { FoodDrawer } from './components/library/food-drawer';

const food = { id: 'id', name: 'Rice', nameEn: 'Rice', custom: false, kcal: 100, protein: 2, carbs: 20, fat: 1, photo: null, uses: 7 };
beforeEach(() => { vi.clearAllMocks(); mocks.effects = []; });
it('opens the new-food route once and closes the drawer when creating from the library', () => {
  const onClose = vi.fn();
  renderToStaticMarkup(createElement(FoodDrawer, { food: null, onClose, onSaved() {} }));
  for (const effect of mocks.effects) { effect(); effect(); }
  expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/en/captain/library/foods/new');
  expect(onClose).toHaveBeenCalledOnce();
});
it('offers editing global food fields without a catalog delete action', () => {
  const html = renderToStaticMarkup(createElement(FoodDrawer, { food, onClose() {}, onSaved() {} }));
  expect(html).toContain('<fieldset disabled=""');
  expect(html).toContain('Edit food');
  expect(html).not.toContain('Restore original');
  expect(html).toContain('/en/captain/library/foods/new?copyFrom=id');
  expect(html).not.toContain('type="submit"');
  expect(html).not.toContain('Delete food');
});
it('disables deleting a used own food and explains the count', () => {
  const html = renderToStaticMarkup(createElement(FoodDrawer, { food: { ...food, custom: true }, onClose() {}, onSaved() {} }));
  expect(html).toContain('used 7 times in plans');
  expect(html).toContain('/en/captain/library/foods/id/edit');
  expect(html).toContain('Edit food');
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Delete food/);
});
it('offers restore on a modified version even when existing plans use it', () => {
  const html = renderToStaticMarkup(createElement(FoodDrawer, {
    food: { ...food, custom: true, replacesId: 'catalog' }, onClose() {}, onSaved() {},
  }));
  expect(html).toContain('Modified');
  expect(html).toMatch(/<button(?![^>]*disabled="")[^>]*>Restore original/);
});
