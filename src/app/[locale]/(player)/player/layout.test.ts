import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import PlayerLayout from './layout';

vi.mock('@/ui', () => ({ PageContainer: ({ children }: { children: ReactNode }) => children }));
vi.mock('@/features/player-shell', () => ({
  PlayerShell: ({ children }: { children: ReactNode }) => createElement('main', null, children),
}));
vi.mock('@/features/demo', () => ({
  DemoMode: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/features/product-tour', () => ({ ProductTour: () => null }));
vi.mock('@/features/auth', () => ({ SignOutButton: () => null }));
vi.mock('@/features/ko-preview/server', () => ({ KoAccountLink: () => null }));
vi.mock('@/core/timezone/boundary', () => ({ TimezoneBoundary: ({ children }: { children: ReactNode }) => children }));

it('renders player page content', async () => {
  const html = renderToString(await PlayerLayout({ children: createElement('h1', null, 'player-page-content') }));
  expect(html).toContain('<h1>player-page-content</h1>');
  expect(html).not.toContain('player-content');
});
