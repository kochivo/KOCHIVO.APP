import { createElement } from 'react';
import type * as ReactDOM from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CatalogScreen } from './catalog-screen';
import { catalogFixture } from './catalog-fixture';
import type { Catalog } from './types';

const state = vi.hoisted(() => ({ data: null as Catalog | null, portal: vi.fn() }));
vi.mock('@/ui/page-bar-slot', () => ({ usePageBarTarget: (slot: string) => slot }));
vi.mock('react-dom', async original => ({ ...await original<typeof ReactDOM>(),
  createPortal: (children: unknown, target: unknown) => { state.portal(children, target); return children; } }));
vi.mock('./use-catalog', () => ({ useCatalog: () => ({ data: state.data, busy: false, error: '', status: 'ready' }) }));
vi.mock('../data/catalog-actions', () => ({ saveTier: vi.fn(), setOfferPaused: vi.fn() }));
vi.mock('../data/tier-operations', () => ({ changeTierStatus: vi.fn() }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-13T12:00:00Z') }) }));
afterEach(() => { state.data = null; state.portal.mockClear(); vi.unstubAllEnvs(); });

it.each([false, true])('shows one secondary create action and one primary with existing packages: %s', existing => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  state.data = { ...catalogFixture, tiers: existing ? catalogFixture.tiers : [], packages: [], offers: [] };
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(CatalogScreen)));
  const buttons = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(match => match[0]);
  expect(buttons.filter(button => button.includes('primary-surface'))).toHaveLength(1);
  const add = buttons.filter(button => button.includes('+ New package'));
  expect(add).toHaveLength(1);
  expect(add[0]).toContain('glass');
  expect(add[0]).not.toContain('primary-surface');
  expect(html.includes('min-h-[280px]')).toBe(existing);
  expect(html.includes('No packages yet')).toBe(!existing);
});

it('connects the featured tiers before offers only in the workspace path', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.data = catalogFixture;
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(CatalogScreen)));
  expect(html).toContain('glass-featured');
  expect(html).toContain('aria-label="Back"');
  expect(html).toContain('Weekly call');
  expect(html).toContain('2,500');
  expect(html).toContain('6,500');
  expect(html.indexOf('Weekly call')).toBeLessThan(html.indexOf('>Offers<'));
  expect(html).not.toContain('min-h-[280px]');
  expect(state.portal.mock.calls.map(call => call[1])).toEqual(['title', 'actions']);
});
