import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async original => {
 const react = await original<typeof React>();
 return { ...react, useState: (initial: unknown) => {
 const index = state.index++;
 return [index in state.values ? state.values[index] : typeof initial === 'function' ? initial() : initial, () => {}];
 } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));
beforeEach(() => { state.values = []; state.index = 0; });
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
import { PlayerPlans } from './components/player-plans';
import { MealEditor } from './components/meal-editor';
import { PlanBuilder } from './components/plan-builder';
import { FoodPicker } from './components/food-picker';
import { ItemRow } from './components/item-row';
vi.mock('./data/plan-io', () => ({ createPlan() {}, listPlayerPlans() {} }));
vi.mock('./data/foods', () => ({ searchFoods() {} }));
vi.mock('@/features/templates', () => ({ SaveTemplateButton: () => null }));
vi.mock('./hooks/use-plan-draft', () => ({ usePlanDraft: () => ({ draft: { id: 'p', playerId: 'player', title: 'Plan', meals: [], targets: { kcal: 2000, protein: 150, carbs: 200, fat: 60 } }, update() {} }) }));
it('links empty player nutrition plans to templates', () => {
 state.values = [[]];
 expect(render(createElement(PlayerPlans, { playerId: 'player' }))).toMatch(/href="\/captain\/templates"[^>]*>Or start from a template<\/a>/);
});
it('offers adding the first meal inside the empty state', () => {
 const html = render(createElement(PlanBuilder, { planId: 'p' }));
 expect(html).toContain('<h2 class="text-xl font-bold">Add your first meal to start</h2>');
 expect(html).toContain('>Add meal</button>');
});
it('offers choosing food inside an empty meal', () => {
 const html = render(createElement(MealEditor, { meal: { id: 'm', name: 'Lunch', position: 1, items: [] }, first: true, last: true, update() {} }));
 expect(html).toContain('<h2 class="text-xl font-bold">Add the first food</h2>');
 expect(html).toContain('>Add food</button>');
});
it('offers resetting an empty food search', () => {
 state.values = ['missing', 'all', 100, { foods: [], catalogEmpty: false }, false, false];
 expect(render(createElement(FoodPicker, { onPick() {} }))).toContain('>Clear search and filters</button>');
});
it('offers creating food when the entire catalog is empty', () => {
 state.values = ['', 'all', 100, { foods: [], catalogEmpty: true }, false, false];
 expect(render(createElement(FoodPicker, { onPick() {} }))).toContain('>+ New food</button>');
});
it('offers adding the first alternative inside its empty state', () => {
 state.values = [true, false];
 const html = render(createElement(ItemRow, { item: { id: 'i', position: 1, grams: 100, alternatives: [],
   food: { id: 'f', name: 'Rice', kcal: 130, protein: 3, carbs: 28, fat: 0, photo: null, custom: false } }, first: true, last: true, update() {} }));
 expect(html).toContain('<h2 class="text-xl font-bold">No alternatives yet</h2>');
 expect(html).toContain('>Add alternative</button>');
});
