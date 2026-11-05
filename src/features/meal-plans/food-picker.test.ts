import { Children, isValidElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Segmented } from '@/ui';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { FoodPicker } from './components/food-picker';

const state = vi.hoisted(() => ({ changes: [] as unknown[], filter: 'all' }));
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  useEffect: () => {},
  useId: () => 'food-picker-test',
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial === 'all' ? state.filter : initial, (value: unknown) => state.changes.push(value)],
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: () => createT(messages, 'en') }));
vi.mock('./data/foods', () => ({ searchFoods: vi.fn() }));
vi.mock('./data/custom-food', () => ({ deleteCustomFood: vi.fn() }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));

beforeEach(() => { state.changes = []; state.filter = 'all'; });
function select(value: string) {
  const children = Children.toArray(FoodPicker({ onPick() {} }).props.children);
  const segmented = children.find(child => isValidElement(child) && child.type === Segmented);
  if (!isValidElement<{ onChange: (value: string) => void }>(segmented)) throw new Error('Missing filter');
  segmented.props.onChange(value);
}
it.each(['all', 'mine'])('keeps the current %s filter from restarting loading', filter => {
  state.filter = filter;
  select(filter);
  expect(state.changes).toEqual([]);
});
it('loads foods when the selected filter changes', () => {
  select('mine');
  expect(state.changes).toEqual(['mine', true]);
});
