import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async original => {
  const react = await original<typeof React>();
  return { ...react, useState: (initial: unknown) => {
    const index = state.index++;
    return [index in state.values ? state.values[index] : typeof initial === 'function' ? initial() : initial, () => {}];
  } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));
beforeEach(() => { state.values = []; state.index = 0; });
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
import { NutritionScreen } from './components/nutrition-screen';
import { MealCard } from './components/meal-card';
vi.mock('./hooks/use-nutrition-snapshot', () => ({ useNutritionSnapshot: () => ({ snapshot: null, status: 'ready', online: true, today: '2026-11-03' }) }));
vi.mock('./hooks/use-meal-logs', () => ({ useMealLogs: () => [] }));
it('links a missing meal plan to the coach', () => {
 expect(render(createElement(NutritionScreen))).toMatch(/href="\/player\/captain"[^>]*>Message your coach<\/a>/);
});
it('offers a coach message for a meal without food', () => {
 const html = render(createElement(MealCard, { meal: { id: 'm', name: 'Lunch', position: 1, items: [] }, today: '2026-11-03' }));
 expect(html).toMatch(/href="\/player\/captain"[^>]*>Message your coach<\/a>/);
});
