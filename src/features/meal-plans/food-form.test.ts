import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { FoodForm, foodFormInput } from './components/food-form';
import { FoodFormEntry } from './components/food-form-entry';
import { resourceStore } from '@/core/resource/store';
import type { LibraryPage } from './data/library-types';
import type { Food } from './types';
import { foodResourceKey } from './data/food-resource-version';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0, save: vi.fn(), replace: vi.fn(), success: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/captain-workspace-enabled', () => ({ captainWorkspaceEnabled: () => true }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useEffect: () => {}, useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => {
    const index = state.index++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => { state.values[index] = value; }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (value: Messages) => createT(value, 'en') }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace, refresh: state.refresh }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: state.success }) }));
vi.mock('./data/custom-food-photo', () => ({ saveCustomFood: state.save }));
const food: Food = { id: '019a805e-0000-7000-8000-000000000001', name: 'Kofta', nameEn: 'Grilled kofta', custom: true,
  kcal: 230, protein: 18, carbs: 4, fat: 16, photo: null, units: [{ key: 'piece', name_ar: 'صباع', name_en: 'Piece', grams: 60 }] };
function render(props: Parameters<typeof FoodForm>[0] = { food }) {
  state.index = 0;
  return FoodForm(props);
}
async function submit(props: Parameters<typeof FoodForm>[0] = { food }) {
  render(props).props.onSubmit({ preventDefault() {} } as React.FormEvent<HTMLFormElement>);
  for (let index = 0; index < 20; index++) await Promise.resolve();
}
beforeEach(() => {
  vi.clearAllMocks(); state.values = []; state.index = 0;
  resourceStore.clear();
  state.save.mockResolvedValue({ ok: true, data: food });
});
it('normalizes unit names and rejects invalid grams or more than twenty units in a per-100 payload', () => {
  const values = { name: 'Rice', nameEn: '', kcal: 200, protein: 10, carbs: 30, fat: 4, units: [] };
  const unit = { key: 'id', name_ar: 'طبق', name_en: ' ', grams: 250 };
  expect(foodFormInput(values)).toEqual({ ...values, servingGrams: 100 });
  expect(foodFormInput({ ...values, units: [unit] }).units).toEqual([{ ...unit, name_en: 'طبق' }]);
  expect(() => foodFormInput({ ...values, units: [{ ...unit, grams: 0 }] })).toThrow();
  expect(() => foodFormInput({ ...values, units: Array.from({ length: 21 }, () => unit) })).toThrow();
});
it('updates the library cache before returning from an edit', async () => {
  const key = () => foodResourceKey('foods-library:["","all",null]');
  await resourceStore.mutate<LibraryPage>(key(), () => ({ foods: [{ ...food, name: 'Old name', uses: 3 }],
    counts: { all: 4, mine: 2, global: 2 }, cursor: null }), async () => {});
  await submit();
  expect(resourceStore.read<LibraryPage>(key()).data).toMatchObject({
    foods: [{ name: 'Kofta', uses: 3 }], counts: { all: 4, mine: 2, global: 2 },
  });
});
it('optimistically replaces a catalog food while saving and rolls back on failure', async () => {
  const key = foodResourceKey('foods-library:["","all",null]');
  const original = { ...food, custom: false, uses: 2 };
  await resourceStore.mutate<LibraryPage>(key, () => ({ foods: [original],
    counts: { all: 1, mine: 0, global: 1 }, cursor: null }), async () => {});
  let finish: (value: { ok: false; error: string }) => void = () => {};
  state.save.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  await submit({ food: original });
  expect(resourceStore.read<LibraryPage>(key).data?.foods).toMatchObject([{ custom: true, replacesId: original.id }]);
  finish({ ok: false, error: 'Failed' });
  for (let index = 0; index < 10; index++) await Promise.resolve();
  expect(resourceStore.read<LibraryPage>(key).data?.foods).toEqual([original]);
});
it('saves unchanged per-100 values, units and an own-food ID, then returns to the library', async () => {
  await submit();
  expect(state.save.mock.calls[0]?.[0]).toEqual({ name: 'Kofta', nameEn: 'Grilled kofta', servingGrams: 100,
    kcal: 230, protein: 18, carbs: 4, fat: 16, fiber: null, units: food.units });
  expect(state.save.mock.calls[0]?.[3]).toBe(food.id);
  expect(state.replace).toHaveBeenCalledWith('/en/captain/library/foods');
  expect(state.success).toHaveBeenCalledWith('Saved Kofta to your library');
});
it('warns about mismatched macros but still saves and adds the first unit to the open meal', async () => {
  const onSaved = vi.fn();
  const props = { food: { ...food, kcal: 400 }, onSaved };
  expect(renderToStaticMarkup(render(props))).toContain('Macros give 232 kcal; you entered 400');
  await submit(props);
  expect(onSaved).toHaveBeenCalledWith(food, 60);
  expect(state.replace).not.toHaveBeenCalled();
});
it('keeps the first-unit preview and all macro fields in the responsive editor', () => {
  const html = renderToStaticMarkup(render());
  expect(html).toContain('min-[761px]:grid-cols-');
  expect(html).toContain('Grilled kofta');
  expect(html).toContain('Piece');
  expect(html).toContain('138');
  expect(html).toContain('type="text"');
  expect(html).toContain('inputMode="decimal"');
});
it('copies global foods without sending an update ID', async () => {
  await submit({ food: { ...food, custom: false } });
  expect(state.save.mock.calls[0]?.[0]).toMatchObject({ copyFrom: food.id, servingGrams: 100 });
  expect(state.save.mock.calls[0]?.[3]).toBeUndefined();
});
it('keeps the form open on save failure and allows another attempt', async () => {
  state.save.mockResolvedValueOnce({ ok: false, error: 'Save unavailable' });
  await submit();
  expect(renderToStaticMarkup(render())).toContain('Save unavailable');
  expect(state.replace).not.toHaveBeenCalled();
  await submit();
  expect(state.success).toHaveBeenCalledOnce();
});
it('rejects invalid units before saving', async () => {
  await submit({ food: { ...food, units: [{ key: 'bad', name_ar: 'Plate', name_en: 'Plate', grams: 0 }] } });
  expect(state.save).not.toHaveBeenCalled();
  expect(renderToStaticMarkup(render())).toContain('Check the name');
});
it('only returns to local captain routes', async () => {
  await submit({ food, returnTo: 'https://example.org' });
  expect(state.replace).toHaveBeenCalledWith('/en/captain/library/foods');
});
it('shows the portion preview with scaled nutrition', () => {
  const html = renderToStaticMarkup(render());
  expect(html).toContain('Piece (60 g)');
  expect(html).toContain('138');
  expect(html).toContain('10.8');
});
it('shows a read error with retry instead of opening a blank form', () => {
  const html = renderToStaticMarkup(FoodFormEntry({ result: { ok: false, error: 'Food unavailable' } }));
  expect(html).toContain('role="alert"');
  expect(html).toContain('Food unavailable');
  expect(html).toContain('Try again');
  expect(html).not.toContain('<form');
});
it('prevents duplicate submissions while a save is pending and reports busy state to the caller', async () => {
  let finish: (value: { ok: true; data: Food }) => void = () => {};
  state.save.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const onBusyChange = vi.fn();
  const tree = render({ food, onBusyChange });
  tree.props.onSubmit({ preventDefault() {} } as React.FormEvent<HTMLFormElement>);
  tree.props.onSubmit({ preventDefault() {} } as React.FormEvent<HTMLFormElement>);
  expect(state.save).toHaveBeenCalledOnce();
  expect(onBusyChange).toHaveBeenLastCalledWith(true);
  finish({ ok: true, data: food });
  for (let index = 0; index < 20; index++) await Promise.resolve();
  expect(onBusyChange).toHaveBeenLastCalledWith(false);
});
