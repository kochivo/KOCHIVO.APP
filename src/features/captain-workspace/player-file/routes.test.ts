import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProfilePage from '@/app/[locale]/(captain)/captain/players/[playerId]/page';
import FoodPage from '@/app/[locale]/(captain)/captain/players/[playerId]/nutrition/page';
import AssessmentsPage from '@/app/[locale]/(captain)/captain/players/[playerId]/assessments/page';
import CheckinsPage from '@/app/[locale]/(captain)/captain/players/[playerId]/checkins/page';
import ChatPage from '@/app/[locale]/(captain)/captain/players/[playerId]/chat/page';
import { ProfileScreen, fetchPlayerProfile, parseTab } from '@/features/player-profile';
import { PlayerPlans } from '@/features/meal-plans';
import { PlayerFileEntry } from '../server';

const state = vi.hoisted(() => ({ data: Promise.resolve({ data: null }) }));
vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/features/player-profile', async () => ({
  fetchPlayerProfile: () => state.data, parseTab: (value: unknown) => typeof value === 'string' ? value : 'intake',
  ProfileScreen: ({ tab }: { tab: string }) => createElement('section', null, tab), playerProfileMessages: {},
}));
vi.mock('@/features/meal-plans', () => ({ PlayerPlans: () => createElement('section', null, 'plans'),
  NutritionWorkspaceEntry: () => createElement('div', null, 'nutrition workspace'), mealPlanMessages: {},
}));
vi.mock('../server', () => ({ PlayerFileEntry: () => createElement('section', null, 'player file') }));
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-12T10:00:00Z')); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
const params = Promise.resolve({ playerId: 'p', locale: 'ar' });
it.each([undefined, '0', 'true'])('keeps every legacy player tab and food page byte-identical with flag %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  for (const tab of ['intake', 'progress', 'plan', 'checkins', 'analysis', 'readiness']) {
    const tree = await ProfilePage({ params, searchParams: Promise.resolve({ tab }) });
    const previous = createElement(ProfileScreen, { key: 'p', playerId: 'p', tab: parseTab(tab), today: '2026-11-12', data: fetchPlayerProfile('p') });
    expect(tree).toEqual(previous);
    expect(renderToStaticMarkup(tree)).toBe(renderToStaticMarkup(previous));
  }
  const food = await FoodPage({ params });
  expect(food).toEqual(createElement(PlayerPlans, { playerId: 'p' }));
  expect(renderToStaticMarkup(food)).toBe(renderToStaticMarkup(createElement(PlayerPlans, { playerId: 'p' })));
});
it('routes flag-on profile and food to the same player shell', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect((await ProfilePage({ params, searchParams: Promise.resolve({}) })).type).toBe(PlayerFileEntry);
  const food = await FoodPage({ params, searchParams: Promise.resolve({ view: 'calc' }) });
  expect(food.type).toBe(PlayerFileEntry); expect(food.props.tab).toBe('nutrition');
});
it.each([AssessmentsPage, CheckinsPage, ChatPage])('gates a new tab route and opens the file only with the flag enabled', async Page => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  await expect(Page({ params })).rejects.toThrow();
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect((await Page({ params })).type).toBe(PlayerFileEntry);
});
it('resolves the chat notification destination to the chat tab', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const page = await ChatPage({ params });
  expect(page.props).toEqual({ playerId: 'p', tab: 'chat' });
});
it('retains the old reminder arrival URL through the new check-ins route', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  await expect(ProfilePage({ params, searchParams: Promise.resolve({ tab: 'checkins' }) })).rejects.toMatchObject({
    digest: expect.stringContaining('/captain/players/p/checkins'),
  });
});
