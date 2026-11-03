import { Children, isValidElement } from 'react';
import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { FoodPicker } from './components/food-picker';
import type { Food } from './types';

const state = vi.hoisted(() => ({ values: [] as unknown[], refs: [] as { current: unknown }[], index: 0, ref: 0,
  remove: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useEffect: () => {}, useId: () => 'picker',
  useRef: (current: unknown) => state.refs[state.ref++] ?? (state.refs[state.ref - 1] = { current }),
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (next: unknown) => {
      state.values[index] = typeof next === 'function' ? next(state.values[index]) : next;
    }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: () => createT(messages, 'en') }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: state.success, error: state.error }) }));
vi.mock('./data/custom-food', () => ({ deleteCustomFood: state.remove }));
vi.mock('./data/foods', () => ({ searchFoods: vi.fn() }));
vi.mock('next/dynamic', () => ({ default: () => function Sheet() { return null; } }));
const food: Food = { id: 'food', name: 'Soup', kcal: 100, protein: 5, carbs: 10, fat: 2, photo: null, custom: true };
function render() {
  state.index = 0; state.ref = 0;
  return FoodPicker({ onPick() {} });
}
function elements(node: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap(child => isValidElement<Record<string, unknown>>(child)
    ? [child, ...elements(child.props.children as React.ReactNode)] : []);
}
function click(label: string) {
  const button = elements(render()).find(element => element.props['aria-label'] === label);
  if (!button) throw new Error(`Missing ${label}`);
  (button.props.onClick as () => void)();
}
const foods = () => (state.values[3] as { foods: Food[] }).foods;
beforeEach(() => {
  vi.clearAllMocks(); state.refs = [];
  state.values = ['', 'all', 100, { foods: [food], catalogEmpty: false }, false, false, 0, false, ''];
  vi.stubGlobal('window', { confirm: () => true });
});
afterEach(() => vi.unstubAllGlobals());
it('removes immediately and restores a food when deletion fails', async () => {
  let reject: (error: Error) => void = () => {};
  state.remove.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  click('Delete food');
  expect(foods()).toEqual([]);
  reject(new Error('failed'));
  await Promise.resolve();
  expect(foods()).toEqual([food]);
  expect(state.error).toHaveBeenCalled();
});
it('keeps the food when deletion is cancelled', () => {
  vi.stubGlobal('window', { confirm: () => false });
  click('Delete food');
  expect(foods()).toEqual([food]);
  expect(state.remove).not.toHaveBeenCalled();
});
it('updates immediately during an edit and restores the previous values on failure', () => {
  click('Edit food');
  const sheet = elements(render()).find(element => element.props.food === food);
  if (!sheet) throw new Error('Missing edit sheet');
  const rollback = (sheet.props.onOptimistic as (food: Food) => () => void)({ ...food, name: 'New soup', kcal: 200 });
  expect(foods()[0]).toMatchObject({ name: 'New soup', kcal: 200 });
  rollback();
  expect(foods()).toEqual([food]);
});
it('offers creating food before the filters and in an empty mine filter', () => {
  state.values[1] = 'mine'; state.values[3] = { foods: [], catalogEmpty: false };
  const tree = render();
  const first = Children.toArray(tree.props.children)[0];
  expect(isValidElement<{ children: string }>(first) && first.props.children).toBe('+ New food');
  const empty = elements(tree).find(element => typeof element.props.action === 'object');
  expect(empty?.props.action).toMatchObject({ label: '+ New food' });
});
