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
import { SmartAlerts } from './components/smart-alerts';
import { PlayerFinder } from './components/player-finder';
it('links an all-clear alert list to players', () => {
 const html = render(createElement(SmartAlerts, { alerts: [] }));
 expect(html).toMatch(/href="\/captain\/players"[^>]*>Go to players<\/a>/);
});
it('offers clearing an unmatched player search', () => {
 state.values = ['missing'];
 const html = render(createElement(PlayerFinder, { players: [], recent: [] }));
 expect(html).toContain('>Clear search</button>');
});
