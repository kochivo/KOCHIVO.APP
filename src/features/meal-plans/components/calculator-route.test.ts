import { createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import Page from '@/app/[locale]/(captain)/captain/players/[playerId]/nutrition/page';
import { NutritionWorkspaceEntry, PlayerPlans } from '../index';
import { PlayerFileEntry } from '@/features/captain-workspace/server';

vi.mock('../index', () => ({ PlayerPlans: () => null, NutritionWorkspaceEntry: () => null, mealPlanMessages: {} }));
vi.mock('@/features/captain-workspace/server', () => ({ PlayerFileEntry: () => null }));
afterEach(() => vi.unstubAllEnvs());
const params = Promise.resolve({ playerId: 'player', locale: 'en' });
it.each([undefined, '', '0', 'true'])('preserves the legacy tree when the flag is %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  expect(await Page({ params, searchParams: Promise.resolve({ view: 'calc' }) }))
    .toEqual(createElement(PlayerPlans, { playerId: 'player' }));
});
it.each(['calc', 'plan'])('renders the flagged %s view', async view => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(await Page({ params, searchParams: Promise.resolve({ view }) }))
    .toEqual(createElement(PlayerFileEntry, { playerId: 'player', tab: 'nutrition' },
      createElement(NutritionWorkspaceEntry, { playerId: 'player', locale: 'en', view })));
});
