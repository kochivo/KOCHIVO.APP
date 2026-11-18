import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type * as Offline from '@/core/offline';
import type * as Nutrition from '@/features/nutrition';
import { HomeTiles } from './components/home-tiles';

vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(), useLiveQuery: () => ({ water_ml: 500 }) }));
vi.mock('@/features/nutrition', async original => ({ ...await original<typeof Nutrition>(),
  useNutritionSnapshot: () => ({ status: 'ready', snapshot: {
    water_target_ml: 3500, title: 'Plan', meals: [], targets: { kcal: 2000 },
  } }), useMealLogs: () => [],
}));

it('uses the plan water target instead of the weight goal', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(HomeTiles, { playerId: 'player', today: '2026-11-15', weightKg: 80 })));
  expect(html).toContain('of 3.5 L');
});
