import { createElement, Suspense, use } from 'react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
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

it('renders captain page content while optional tour and sidebar reads are pending', async () => {
  const page = createElement('h1', null, 'captain-page-content');
  const html = renderToString(await CaptainLayout({ children: page }));
  expect(html).toContain('<h1>captain-page-content</h1>');
  expect(html).not.toContain('demo-loading');
});
