import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { BudgetResult } from './components/budget-result';
import { BudgetPrice } from './components/budget-price';
import { ShoppingList } from './components/shopping-list';
import type { BudgetDay } from './budget-plan';

const day: BudgetDay = { meals: [], macros: { kcal: 1000, protein: 50, carbs: 100, fat: 20 }, costEgp: 100, feasible: true, shortBy: 0 };
const render = (child: ReturnType<typeof h>) => renderToStaticMarkup(h(LocaleProvider, { locale: 'en' }, child));
it('shows generation action for feasible plans and the reachable protein choice for infeasible plans', () => {
  expect(render(h(BudgetResult, { day, onApply: () => {}, playerId: 'player' }))).toContain('Use plan');
  const html = render(h(BudgetResult, { day: { ...day, feasible: false, shortBy: 25 }, onApply: () => {}, playerId: 'player' }));
  expect(html).toContain('25');
  expect(html).toContain('Reduce protein to 50');
  expect(html).toContain('Message player');
  expect(html).toContain('/captain/players/player/chat');
});
it('hides all price content without a budget or without a food price', () => {
  expect(render(h(BudgetPrice, { budget: null, cost: 25 }))).toBe('');
  expect(render(h(BudgetPrice, { budget: 4500, cost: null }))).toBe('');
  expect(render(h(BudgetPrice, { budget: 4500, cost: 25 }))).toContain('25 EGP');
});
it('renders a shopping total and shares only the shopping text', () => {
  const html = render(h(ShoppingList, { days: [day] }));
  expect(html).toContain('Weekly shopping');
  expect(html).toContain('No priced items');
  expect(html).not.toContain('wa.me');
});
it('renders rounded shopping purchases and an encoded WhatsApp list', () => {
  const food = { id: 'rice', name: 'Rice', tag: 'main' as const, kcal: 100, protein: 3, carbs: 20, fat: 0,
    pricePerGram: 0.02, unit: 'kg' as const, unitGrams: 1000 };
  const html = render(h(ShoppingList, { days: [{ ...day, meals: [{ tag: 'main', macros: day.macros, costEgp: 2.5, items: [{ food, grams: 125 }] }] }] }));
  expect(html).toContain('Rice: 1 kg');
  expect(html).toContain('Total: 20 EGP');
  const href = html.match(/href="(https:\/\/wa.me\/\?text=[^"]+)"/)?.[1];
  expect(href).toBeDefined();
  expect(decodeURIComponent(href ?? '')).toContain('Rice: 1 kg · 20 EGP\nTotal: 20 EGP');
  expect(href).not.toContain('player');
});
