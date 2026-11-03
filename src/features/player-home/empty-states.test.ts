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
import { HomeScreen } from './components/home-screen';
import { TodayCard } from './components/today-card';
vi.mock('./hooks/use-program-snapshot', () => ({ useProgramSnapshot: () => ({ snapshot: null, status: 'ready' }) }));
vi.mock('./hooks/use-week-sessions', () => ({ useWeekSessions: () => [] }));
vi.mock('@/core/offline', () => ({ localDb() {}, pendingCount() {}, useLiveQuery: () => [] }));
vi.mock('./components/next-task-slot', () => ({ NextTaskSlot: () => null }));
vi.mock('./components/nutrition-slot', () => ({ NutritionSlot: () => null }));
it('links a missing program to the coach', () => {
 state.values = [new Date('2026-11-03T10:00:00Z')];
 expect(render(createElement(HomeScreen))).toMatch(/href="\/player\/captain"[^>]*>Message your coach<\/a>/);
});
it('links a day without exercises to the coach', () => {
 const html = render(createElement(TodayCard, { day: { id: 'd', title: 'Day', position: 1, exercises: [] }, rest: false }));
 expect(html).toMatch(/href="\/player\/captain"[^>]*>Message your coach<\/a>/);
 expect(html).not.toContain('href="/player/workout/d"');
});
