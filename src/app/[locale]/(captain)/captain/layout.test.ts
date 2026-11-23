import { createElement, Suspense, use } from 'react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import CaptainLayout from './layout';

const pending = vi.hoisted(() => new Promise<void>(() => {}));

vi.mock('@/ui', () => ({ PageContainer: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/features/roster', () => ({
  captainApproval: async () => null,
  CaptainShell: ({ children, sidebarFooter }: { children: ReactNode; sidebarFooter: ReactNode }) =>
    createElement('main', null, sidebarFooter, children),
}));
vi.mock('@/features/demo', () => ({
  // DemoMode's real Suspense boundary also encloses the page and the tour.
  DemoMode: ({ children }: { children: ReactNode }) => createElement(Suspense, { fallback: 'demo-loading' }, children),
}));
vi.mock('@/features/product-tour', () => ({ ProductTour: () => { use(pending); return null; } }));
vi.mock('@/features/billing', () => ({ PlanSidebar: () => { use(pending); return null; } }));
vi.mock('@/features/billing/server', () => ({ fetchPlanSummary: async () => null }));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'ar' }));
vi.mock('@/core/timezone/boundary', () => ({ TimezoneBoundary: ({ children }: { children: ReactNode }) => children }));

afterEach(() => vi.unstubAllEnvs());

it('renders captain page content while optional tour and sidebar reads are pending', async () => {
  const page = createElement('h1', null, 'captain-page-content');
  const html = renderToString(await CaptainLayout({ children: page }));
  expect(html).toContain('<h1>captain-page-content</h1>');
  expect(html).not.toContain('demo-loading');
});

// T-428: the legacy shell pads its main with page-bottom clearance only
// (and none on desktop), so the layout supplies the shared launcher
// clearance there; the workspace frame already pads its own main.
it('pads legacy captain pages with the shared launcher clearance', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '');
  const html = renderToString(await CaptainLayout({ children: createElement('h1', null, 'captain-page-content') }));
  expect(html).toContain('class="captain-content"');
  expect(html).toContain('<h1>captain-page-content</h1>');
});

it('does not double-pad workspace captain pages', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = renderToString(await CaptainLayout({ children: createElement('h1', null, 'captain-page-content') }));
  expect(html).not.toContain('captain-content');
  expect(html).toContain('<h1>captain-page-content</h1>');
});
