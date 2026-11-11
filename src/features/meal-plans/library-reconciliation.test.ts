import { Children, isValidElement } from 'react';
import type * as React from 'react';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './components/library/messages';
import type { LibraryPage } from './data/library-types';
import type { Food } from './types';

const state = vi.hoisted(() => ({ index: 0, page: undefined as LibraryPage | undefined, retry: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => [['', '', 'all', null, null][state.index++], () => {}],
  useCallback: (callback: unknown) => callback,
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en') }));
vi.mock('@/core/resource', () => ({ useResource: () => ({
  status: 'ready', data: state.page, retry: state.retry,
  mutate: async (next: (page: LibraryPage | undefined) => LibraryPage, commit: () => Promise<void>) => {
    state.page = next(state.page); await commit(); return true;
  },
}) }));
vi.mock('./data/food-library', () => ({ listLibraryFoods: vi.fn() }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
import { FoodsLibraryEntry } from './components/foods-library-entry';

it('replaces the temporary row with the saved id and values before refreshing', async () => {
  const temporary = { id: 'temporary', name: 'Rice', kcal: 1, protein: 0, carbs: 0, fat: 0, photo: null, custom: true, uses: 0 };
  state.index = 0;
  state.page = { foods: [temporary], cursor: null, counts: { all: 1, mine: 1, global: 0 } };
  const saved = { ...temporary, id: 'persisted', kcal: 2, photo: 'food-media/rice.jpg' };
  const tree = FoodsLibraryEntry();
  const drawer = Children.toArray(tree.props.children).find(child => isValidElement<{ onSaved?: unknown }>(child) && child.props.onSaved);
  if (!isValidElement<{ onSaved: (food: Food, optimisticId: string) => void }>(drawer)) throw new Error('Missing drawer');
  drawer.props.onSaved(saved, temporary.id);
  expect(state.page.foods).toEqual([saved]);
  await Promise.resolve();
  await Promise.resolve();
  expect(state.retry).toHaveBeenCalledOnce();
});
