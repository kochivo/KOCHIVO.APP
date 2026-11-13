import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { NutritionScreen } from './components/nutrition-screen';

const data = vi.hoisted(() => ({ completed: ['first'] as string[] }));
vi.mock('server-only', () => ({}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/features/supplements', () => ({ PlayerSupplements: () => null }));
vi.mock('./hooks/use-nutrition-snapshot', () => ({ useNutritionSnapshot: () => ({
  snapshot: { title: 'Plan', targets: { kcal: 2000, protein: 100, carbs: 200, fat: 70 },
    meals: ['first', 'second', 'third'].map(id => ({ id, name: id, position: 1, items: [{
      id: `${id}-food`, name: 'Rice', grams: 100, per100g: { kcal: 100, protein: 2, carbs: 20, fat: 1 },
      photo_path: null, alternatives: [],
    }] })),
  }, status: 'ready', stale: false, online: true, pending: 0, parked: 0, today: '2026-11-13',
}) }));
vi.mock('./hooks/use-meal-logs', () => ({ useMealLogs: () => data.completed.map(meal_id => ({
  meal_id, completed_at: '2026-11-13T10:00:00Z', deleted_at: null, log_date: '2026-11-13', swaps: {},
})) }));
afterEach(() => { vi.unstubAllEnvs(); data.completed = ['first']; });

it('preserves the legacy completion controls when the workspace flag is off', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(NutritionScreen)));
  expect(html.match(/<button[^>]*bg-lime /g)).toHaveLength(2);
  expect(html.match(/<button[^>]*aria-pressed="true"[^>]*>/)?.[0]).toContain('bg-transparent');
});

it.each([{ completed: [], next: 0 }, { completed: ['first'], next: 1 }, { completed: ['first', 'second'], next: 2 },
  { completed: ['first', 'second', 'third'], next: null }])(
  'keeps one next-meal action with $completed eaten, including open details', ({ completed, next }) => {
    vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
    data.completed = completed;
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(NutritionScreen)));
    const lime = html.match(/<button[^>]*bg-lime /g) ?? [];
    expect(lime).toHaveLength(completed.length === 3 ? 0 : 1);
    const controls = html.match(/<button[^>]*aria-label="[^"]*"[^>]*aria-pressed="(?:true|false)"[^>]*>/g) ?? [];
    expect(controls).toHaveLength(3);
    controls.forEach((button, index) => {
      if (index === next) expect(button).toContain('bg-lime');
      else expect(button).not.toContain('bg-lime');
    });
    const checked = html.match(/<button[^>]*aria-pressed="true"[^>]*>/g) ?? [];
    for (const button of checked) {
      expect(button).toContain('glass');
      expect(button).not.toContain('bg-lime');
    }
  },
);
