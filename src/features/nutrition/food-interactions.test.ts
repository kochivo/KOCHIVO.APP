import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { KochivoDB, stableId } from '@/core/offline';
import { MealCard } from './components/meal-card';
import { FoodWater } from './components/food-water';
import { setMealEaten } from './data/log-meal';
import { saveDailyCheck } from '@/features/readiness';
import type * as JsxRuntime from 'react/jsx-runtime';
import type * as JsxDevRuntime from 'react/jsx-dev-runtime';
import type * as Offline from '@/core/offline';
import type * as MealActions from './data/log-meal';
import type * as Readiness from '@/features/readiness';

const state = vi.hoisted(() => ({
  db: undefined as KochivoDB | undefined,
  buttons: [] as { 'aria-label'?: string; onClick?: () => void }[],
  pending: undefined as Promise<unknown> | undefined,
}));
vi.mock('react/jsx-runtime', async original => {
  const runtime = await original<typeof JsxRuntime>();
  const capture = (type: Parameters<typeof runtime.jsx>[0], props: Parameters<typeof runtime.jsx>[1], key?: string) => {
    if (type === 'button' && props && typeof props === 'object') state.buttons.push(props);
    return runtime.jsx(type, props, key);
  };
  return { ...runtime, jsx: capture, jsxs: capture };
});
// Vitest renders through the dev runtime, so buttons must be captured there too.
vi.mock('react/jsx-dev-runtime', async original => {
  const runtime = await original<typeof JsxDevRuntime>();
  const jsxDEV: typeof runtime.jsxDEV = (type, props, key, isStatic, source, self) => {
    if (type === 'button' && props && typeof props === 'object') state.buttons.push(props);
    return runtime.jsxDEV(type, props, key, isStatic, source, self);
  };
  return { ...runtime, jsxDEV };
});
vi.mock('@/core/offline', async original => ({
  ...await original<typeof Offline>(),
  localDb: () => state.db,
  useLiveQuery: () => ({ playerId: 'player', owner: 'player', today: '2026-11-13', row: { water_ml: 500 } }),
}));
vi.mock('./data/log-meal', async original => {
  const actual = await original<typeof MealActions>();
  return { setMealEaten: vi.fn((...args: Parameters<typeof actual.setMealEaten>) => {
    const promise = actual.setMealEaten(...args);
    state.pending = promise;
    return promise;
  }) };
});
vi.mock('@/features/readiness', async original => {
  const actual = await original<typeof Readiness>();
  return { ...actual, saveDailyCheck: vi.fn((...args: Parameters<typeof actual.saveDailyCheck>) => {
    const promise = actual.saveDailyCheck(...args);
    state.pending = promise;
    return promise;
  }) };
});
afterEach(async () => {
  await state.db?.delete();
  state.buttons = [];
  state.pending = undefined;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
const now = Date.parse('2026-11-13T10:00:00Z');

it('the meal check writes the existing meal log and offline queue', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  vi.spyOn(Date, 'now').mockReturnValue(now);
  state.db = new KochivoDB('food-check');
  renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(MealCard, {
    today: '2026-11-13', primary: true, meal: { id: 'meal', name: 'Lunch', position: 1, items: [{
      id: 'rice', position: 1, name: 'Rice', grams: 200, photo_path: null, alternatives: [],
      per100g: { kcal: 100, protein: 2, carbs: 20, fat: 1 },
    }] },
  })));
  const check = state.buttons.find(button => button['aria-label'] === 'Ate Lunch');
  expect(check).toBeDefined();
  check?.onClick?.();
  await state.pending;
  expect(setMealEaten).toHaveBeenCalled();
  expect(await state.db.meal_logs.toArray()).toMatchObject([{ meal_id: 'meal', log_date: '2026-11-13', completed_at: '2026-11-13T10:00:00.000Z' }]);
  expect(await state.db.outbox.toArray()).toMatchObject([{ table: 'meal_logs' }]);
});

it('the water plus adds 250 ml without replacing readiness answers', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(now);
  state.db = new KochivoDB('food-water');
  const id = await stableId('daily_check', 'player', '2026-11-13');
  await state.db.daily_checks.put({ id, log_date: '2026-11-13', water_ml: 500, sleep_hours: 8, soreness: 2,
    deleted_at: null, client_updated_at: '2026-11-13T09:00:00.000Z' });
  renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(FoodWater, { today: '2026-11-13', playerId: 'player' })));
  const plus = state.buttons.find(button => button['aria-label'] === 'Add a cup of water');
  expect(plus).toBeDefined();
  plus?.onClick?.();
  await state.pending;
  expect(saveDailyCheck).toHaveBeenCalled();
  expect(await state.db.daily_checks.get(id)).toMatchObject({ water_ml: 750, sleep_hours: 8, soreness: 2 });
  expect(await state.db.outbox.toArray()).toMatchObject([{ table: 'daily_checks', row_id: id }]);
});
