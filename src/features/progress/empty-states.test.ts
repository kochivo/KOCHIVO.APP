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
import { ProgressScreen } from './components/progress-screen';
import { LineChart } from './components/line-chart';
vi.mock('@/core/offline', () => ({ localDb() {}, useLiveQuery: () => ({ sets: [], names: {} }) }));
it('offers the first workout and first check-in from empty progress', () => {
 state.values = ['2026-11-03', 0, false, [], false];
 const html = render(createElement(ProgressScreen));
 expect(html).toMatch(/href="\/player"[^>]*>Start a workout<\/a>/);
 expect(html).toContain('>Send weekly check-in</button>');
 expect(html).toContain('<h2 class="text-xl font-bold">Your first check-in</h2>');
});
it('gives an empty chart a way to record measurements', () => {
 expect(render(createElement(LineChart, { points: [], title: 'Weight', unit: 'kg' }))).toMatch(/href="\/player\/progress"[^>]*>Send weekly check-in<\/a>/);
});
