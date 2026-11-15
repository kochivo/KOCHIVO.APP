import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type * as Offline from '@/core/offline';
import { KochivoDB } from '@/core/offline';
import { FoodWater } from './components/food-water';
import { mapNutritionSnapshot } from './data/nutrition-snapshot';

vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(), useLiveQuery: () => ({
  playerId: 'player', today: '2026-11-15', owner: 'player', row: null,
}) }));
vi.mock('./hooks/use-nutrition-snapshot', () => ({ useNutritionSnapshot: () => ({ snapshot: { water_target_ml: 3500 } }) }));

it('shows the plan target in food-water', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(FoodWater, { playerId: 'player', today: '2026-11-15' })));
  expect(html).toContain('/ 14 cups');
});
it.each([3500, null])('carries %s through the snapshot and offline cache', async target => {
  const snapshot = mapNutritionSnapshot({ id: 'plan', title: 'Plan', water_target_ml: target,
    target_kcal: 2000, target_protein: null, target_carbs: null, target_fat: null, meals: [] }, 'player');
  const db = new KochivoDB(`water-cache-${target}`);
  try {
    await db.nutrition_snapshot.put(snapshot);
    expect((await db.nutrition_snapshot.get('active'))?.water_target_ml).toBe(target);
  } finally { await db.delete(); }
});
