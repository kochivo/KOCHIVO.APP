import { createElement } from 'react';
import type * as React from 'react';
import type * as Nutrition from '@/features/nutrition';
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
import { NutritionSlot } from './components/nutrition-slot';
vi.mock('@/features/nutrition', async original => ({
 ...await original<typeof Nutrition>(),
 useNutritionSnapshot: () => ({ snapshot: null, status: 'ready', today: '2026-11-19' }),
 useMealLogs: () => [],
}));
it('links an empty home nutrition summary to the coach', () => {
 expect(render(createElement(NutritionSlot))).toMatch(/href="\/player\/captain"[^>]*>Message your coach<\/a>/);
});
