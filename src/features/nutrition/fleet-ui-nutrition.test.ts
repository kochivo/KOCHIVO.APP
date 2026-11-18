import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { NutritionSnapshot } from '@/core/offline';
import { NutritionScreen } from './components/nutrition-screen';

const state = vi.hoisted(() => ({ snapshot: null as NutritionSnapshot | null, status: 'empty' }));
vi.mock('./hooks/use-nutrition-snapshot', () => ({ useNutritionSnapshot: () => ({ ...state,
  today: '2026-11-06', online: true, stale: false, pending: 0, retry() {}, onError() {}, retryKey: 0 }) }));
vi.mock('./hooks/use-meal-logs', () => ({ useMealLogs: () => [] }));
vi.mock('@/features/supplements', () => ({ PlayerSupplements: () => null }));
const render = (locale: 'ar' | 'en') => renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(NutritionScreen)));
it('orders the v4 calorie summary, meals and water, and keeps the empty plan message', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  try {
    state.status = 'ready';
    state.snapshot = { id: 'active', player_id: 'player', plan_id: 'plan', title: 'Plan',
      meals: [{ id: 'lunch', name: 'Lunch', position: 1, items: [] }],
      targets: { kcal: 1500, protein: 120, carbs: 150, fat: 50 } };
    const html = render('en');
    expect(html.match(/data-food-section="[^"]+"/g)).toEqual([
      'data-food-section="macros"', 'data-food-section="meals"', 'data-food-section="water"',
    ]);
    state.snapshot = null;
    expect(render('en')).toContain('href="/player/captain"');
  } finally { vi.unstubAllEnvs(); }
});
it.each(['ar', 'en'] as const)('offers coach contact for absent and empty meal plans in %s', locale => {
  state.status = 'empty'; state.snapshot = null;
  expect(render(locale)).toContain('href="/player/captain"');
  state.status = 'ready';
  state.snapshot = { id: 'active', player_id: 'player', plan_id: 'plan', title: 'Plan', meals: [],
    targets: { kcal: null, protein: null, carbs: null, fat: null } };
  expect(render(locale)).toContain('href="/player/captain"');
  expect(render(locale)).not.toContain('<ul');
});
it.each(['ar', 'en'] as const)('shows loading and a retryable error in %s', locale => {
  state.snapshot = null; state.status = 'loading';
  expect(render(locale)).toContain('aria-busy="true"');
  state.status = 'error';
  const html = render(locale);
  expect(html).toContain('role="alert"');
  expect(html).toContain(locale === 'en' ? 'Try again' : 'جرّب تاني');
});
