import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CatalogScreen } from './catalog-screen';
import { catalogFixture } from './catalog-fixture';
import type { Catalog } from './types';

const state = vi.hoisted(() => ({ data: null as Catalog | null }));
vi.mock('./use-catalog', () => ({ useCatalog: () => ({ data: state.data, busy: false, error: '', status: 'ready' }) }));
vi.mock('../data/catalog-actions', () => ({ saveTier: vi.fn(), setOfferPaused: vi.fn() }));
vi.mock('../data/tier-operations', () => ({ changeTierStatus: vi.fn() }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-13T12:00:00Z') }) }));
afterEach(() => { state.data = null; });

it.each([false, true])('shows one secondary create action and one primary with existing packages: %s', existing => {
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
