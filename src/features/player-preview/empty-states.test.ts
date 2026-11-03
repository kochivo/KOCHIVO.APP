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
import { PreviewProgram } from './components/preview-program';
import { PreviewNutrition } from './components/preview-nutrition';
import { PreviewScreen } from './components/preview-screen';
vi.mock('server-only', () => ({}));
it('links missing preview plans to templates', () => {
 expect(render(createElement(PreviewProgram, { program: null }))).toMatch(/href="\/captain\/templates"[^>]*>Choose a template<\/a>/);
 state.index = 0;
 expect(render(createElement(PreviewNutrition, { nutrition: null }))).toMatch(/href="\/captain\/templates"[^>]*>Choose a template<\/a>/);
});
it('links empty program days to their editor', () => {
 expect(render(createElement(PreviewProgram, { program: { id: 'active', player_id: 'p', program_id: 'program', title: 'Plan', notes: null, settings: {}, training_days: [], days: [] } }))).toMatch(/href="\/captain\/programs\/program"[^>]*>Edit plan<\/a>/);
});
it('gives the empty Today preview a template action', () => {
 const html = render(createElement(PreviewScreen, { today: '2026-11-03', result: { data: { name: 'Ali', program: null, todayDay: null, nutrition: null, sessions: [], week: [] } } }));
 expect(html).toMatch(/href="\/captain\/templates"[^>]*>Choose a template<\/a>/);
});
it('takes an unavailable player preview back to players', () => {
 expect(render(createElement(PreviewScreen, { today: '2026-11-03', result: { data: null } }))).toMatch(/href="\/captain\/players"[^>]*>Open players<\/a>/);
});
