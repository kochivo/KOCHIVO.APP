import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { BudgetSheet } from './components/budget-sheet';
import type { PlanDraft } from './types';

const fixture = vi.hoisted(() => ({ monthly: 4500 as number | null, daily: 150 as number | null }));
vi.mock('./data/food-prices', () => ({ loadFoodPrices: async () => ({}) }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: { ...fixture, foods: [{ name_ar: 'عدس', name_en: 'Lentils',
  budgetFood: { id: 'lentils', name: 'عدس', tag: 'main', kcal: 100, protein: 10, carbs: 15, fat: 0,
    pricePerGram: 0.02, unit: 'kg', unitGrams: 1000 } }] } }) }));
const draft: PlanDraft = { id: 'plan', playerId: 'player', title: 'Plan', status: 'draft',
  targets: { kcal: 2400, protein: 150, carbs: 200, fat: 70 }, meals: [] };
const render = () => renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, h(BudgetSheet, {
  draft, targets: { ...draft.targets, kcal: 1600, protein: 100 }, dayType: 'rest', onApply() {}, onClose() {},
})));

it('renders the captain sheet with the player budget and selected-day targets', () => {
  const html = render();
  expect(html).toContain('150 EGP');
  expect(html).toContain('1,600');
  expect(html).not.toContain('2,400');
  expect(html).toContain('Lentils');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('Make plan');
});
it('withholds generation when the player has no budget', () => {
  fixture.monthly = null; fixture.daily = null;
  try {
    const html = render();
    expect(html).toContain('has not entered a food budget');
    expect(html).not.toContain('Make plan');
  } finally { fixture.monthly = 4500; fixture.daily = 150; }
});
