import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { FoodSearch } from './food-search';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';

const state = vi.hoisted(() => ({ query: '', status: 'ready', data: { foods: [] as { id: string; name: string; nameEn: string }[], catalogEmpty: false },
  error: undefined as unknown, search: vi.fn(), load: undefined as undefined | (() => Promise<unknown>) }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => [state.query, vi.fn()], useCallback: (fn: unknown) => fn,
}));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Messages) => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('../../data/foods', () => ({ searchFoods: state.search }));
vi.mock('@/core/resource', () => ({ useResource: (_key: string | null, load: () => Promise<unknown>) => {
  state.load = load; return { data: state.data, status: state.status, error: state.error, retry: vi.fn() };
} }));
beforeEach(() => {
  state.query = 'egg'; state.status = 'ready'; state.data = { foods: [], catalogEmpty: false }; state.error = undefined;
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
it.each(['loading', 'error', 'empty'] as const)('has a %s state', kind => {
  state.status = kind === 'empty' ? 'ready' : kind;
  state.error = kind === 'error' ? new Error('failure') : undefined;
  const html = render();
  expect(html).toContain(kind === 'loading' ? 'role="status"' : kind === 'error' ? 'Try again' : 'No food');
});
