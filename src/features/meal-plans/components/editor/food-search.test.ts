import { Children, createElement, isValidElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { FoodSearch } from './food-search';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { addItem } from '../../draft';
import type { Food, PlanDraft } from '../../types';

const state = vi.hoisted(() => ({ query: '', status: 'ready', data: { foods: [] as { id: string; name: string; nameEn: string }[], catalogEmpty: false },
  error: undefined as unknown, search: vi.fn(), creating: false, change: vi.fn(),
  boolCalls: 0, open: true, load: undefined as undefined | (() => Promise<unknown>) }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useId: () => 'food-search', useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [typeof initial === 'string' ? state.query : state.boolCalls++ % 2 === 0 ? state.open : state.creating, state.change], useCallback: (fn: unknown) => fn,
}));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Messages) => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('../../data/foods', () => ({ searchFoods: state.search }));
vi.mock('@/core/resource', () => ({ useResource: (_key: string | null, load: () => Promise<unknown>) => {
  state.load = load; return { data: state.data, status: state.status, error: state.error, retry: vi.fn() };
} }));
beforeEach(() => {
  state.query = 'egg'; state.status = 'ready'; state.data = { foods: [], catalogEmpty: false }; state.error = undefined;
  state.creating = false; state.change.mockClear();
  state.boolCalls = 0; state.open = true;
});
const render = () => renderToStaticMarkup(createElement(FoodSearch, { onPick: vi.fn() }));
it('searches the existing library inline with a bounded query', async () => {
  state.search.mockResolvedValue({ ok: true, data: { foods: [], catalogEmpty: false } });
  expect(render()).toContain('type="search"');
  await state.load?.();
  expect(state.search).toHaveBeenCalledWith({ query: 'egg', limit: 20 });
});
it('shows localized library results and keeps the search text', () => {
  state.data.foods = [{ id: 'egg', name: 'بيض', nameEn: 'Egg' }];
  expect(render()).toContain('Egg');
  expect(render()).toContain('value="egg"');
});
it('surfaces food creation and library results with add icons', () => {
  state.data.foods = [{ id: 'egg', name: 'بيض', nameEn: 'Egg' }];
  const html = render();
  expect(html.match(/<button[^>]*class="[^"]*control-secondary[^>]*>/g)).toHaveLength(3);
  expect(html.match(/lucide-plus/g)).toHaveLength(2);
});
it.each(['loading', 'error', 'empty'] as const)('has a %s state', kind => {
  state.status = kind === 'empty' ? 'ready' : kind;
  state.error = kind === 'error' ? new Error('failure') : undefined;
  const html = render();
  expect(html).toContain(kind === 'loading' ? 'role="status"' : kind === 'error' ? 'Try again' : 'No food');
});

function elements(node: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap(child => isValidElement<Record<string, unknown>>(child)
    ? [child, ...elements(child.props.children as React.ReactNode)] : []);
}
it('returns the newly saved food to the open meal and closes the full-screen form', () => {
  state.creating = true;
  let draft: PlanDraft = { id: 'plan', playerId: null, title: 'Plan', status: 'draft',
    targets: { kcal: 2000, protein: 100, carbs: 250, fat: 60 },
    meals: [{ id: 'breakfast', name: 'Breakfast', position: 0, items: [] }, { id: 'lunch', name: 'Lunch', position: 1, items: [] }] };
  const food: Food = { id: 'egg', name: 'Egg', custom: true, photo: null, kcal: 140, protein: 12, carbs: 1, fat: 10 };
  const tree = FoodSearch({ meal: 'Lunch', onPick: (saved, grams) => { draft = addItem(draft, 'lunch', saved, grams, 'new-item'); } });
  const form = elements(tree).find(element => element.props.initialName === 'egg');
  expect(form).toBeDefined();
  expect(form?.props.onSaved).toBeTypeOf('function');
  (form?.props.onSaved as (food: Food, grams: number) => void)(food, 60);
  expect(draft.meals[0]?.items).toEqual([]);
  expect(draft.meals[1]?.items).toMatchObject([{ food, grams: 60 }]);
  expect(state.change).toHaveBeenCalledWith(false);
  expect(state.change).toHaveBeenCalledWith('');
});
it('keeps the full-screen form open when Escape is pressed during a save', () => {
  state.creating = true;
  const tree = FoodSearch({ onPick() {} });
  const form = elements(tree).find(element => element.props.initialName === 'egg');
  const dialog = elements(tree).find(element => typeof element.props.onDismiss === 'function');
  (form?.props.onBusyChange as (busy: boolean) => void)(true);
  (dialog?.props.onDismiss as () => void)();
  expect(state.change).not.toHaveBeenCalled();
  (form?.props.onBusyChange as (busy: boolean) => void)(false);
  (dialog?.props.onDismiss as () => void)();
  expect(state.change).toHaveBeenCalledWith(false);
});
