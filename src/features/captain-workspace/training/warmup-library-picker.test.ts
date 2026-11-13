import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { WarmupItem } from '@/features/programs';
import { WarmupLibraryPicker } from './warmup-library-picker';
import { messages } from './editor/messages';

const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, data: [] as Record<string, unknown>[], error: false, locale: 'ar' as 'ar' | 'en' }));
const resource = vi.hoisted(() => ({ retry: vi.fn(), load: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => { const index = state.cursor++; if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => { state.values[index] = value; }]; },
  useCallback: (callback: unknown) => callback, useEffect: () => {},
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => state.locale,
  useT: (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, state.locale) }));
vi.mock('@/core/resource', () => ({ useResource: (key: string, loader: () => unknown) => {
  resource.load(key, loader); return { data: state.data, error: state.error, retry: resource.retry };
} }));
vi.mock('./data/library', () => ({ loadTrainingSearch: resource.load }));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '019ab800-0000-7000-8000-000000000001' }));
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
const exerciseId = '019ab800-0000-7000-8000-000000000011';
const onAdd = vi.fn();
function render(items: WarmupItem[] = []) { state.cursor = 0; return nodes(WarmupLibraryPicker({ items, onAdd })); }
function result(items: WarmupItem[] = []) { return render(items).find(node => node.type === 'button' && node.props['aria-label']); }
beforeEach(() => { vi.clearAllMocks(); state.values = []; state.error = false; state.locale = 'ar';
  state.data = [{ id: exerciseId, name_ar: ' دوران ', name_en: 'Rotation' }]; });
it('browses own exercises immediately and can switch to the whole library', () => {
  const toggle = render().find(node => node.type === 'input' && node.props.type === 'checkbox');
  expect(toggle?.props.checked).toBe(true);
  expect(resource.load.mock.calls[0]?.[0]).toBe('training-search:::true');
  (resource.load.mock.calls[0]?.[1] as () => void)();
  expect(resource.load).toHaveBeenLastCalledWith('', '', true);
  (toggle?.props.onChange as (event: { target: { checked: boolean } }) => void)({ target: { checked: false } });
  render(); expect(resource.load.mock.lastCall?.[0]).toBe('training-search:::false');
});
it('adds a trimmed locale name with a UUID, ten reps and the exercise ID', () => {
  (result()?.props.onClick as () => void)();
  expect(onAdd).toHaveBeenCalledWith({ id: '019ab800-0000-7000-8000-000000000001', name: 'دوران', amount: 10, unit: 'reps', exerciseId });
  state.locale = 'en'; state.data[0] = { ...state.data[0], name_en: 'x'.repeat(70) };
  (result()?.props.onClick as () => void)(); expect(onAdd.mock.lastCall?.[0].name).toBe('x'.repeat(60));
});
it('disables existing exercises and every result at twelve items', () => {
  (result()?.props.onClick as () => void)(); const item = onAdd.mock.lastCall?.[0] as WarmupItem;
  expect(result([item])?.props.disabled).toBe(true);
  (result([item])?.props.onClick as () => void)();
  const full = Array.from({ length: 12 }, () => ({ ...item, exerciseId: undefined }));
  expect(result(full)?.props.disabled).toBe(true);
  (result(full)?.props.onClick as () => void)(); expect(onAdd).toHaveBeenCalledOnce();
});
it('shows the own-library empty guidance and retry on errors', () => {
  state.data = []; expect(render().some(node => node.props.children === messages.ar.warmMineEmpty)).toBe(true);
  state.error = true; const retry = render().find(node => node.type === 'button');
  (retry?.props.onClick as () => void)(); expect(resource.retry).toHaveBeenCalledOnce();
});
