import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import PlayerLayout from './layout';

const path = vi.hoisted(() => ({ value: '/player' }));

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (name: string) => (name === 'x-kochivo-path' ? path.value : null) }),
}));
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

const render = async (value: string) => {
  path.value = value;
  return renderToString(await PlayerLayout({ children: createElement('h1', null, 'player-page-content') }));
};

it('renders player page content', async () => {
  const html = await render('/player');
  expect(html).toContain('<h1>player-page-content</h1>');
});

// P1: the shell's inner div never renders for its loading, error and
// no-captain states, while the KO launcher (mounted in the layout, outside
// the shell) floats over those screens too — so the layout, the one place
// that owns every player page, supplies the shared launcher clearance.
it('pads player pages with the shared launcher clearance', async () => {
  const html = await render('/player/nutrition');
  expect(html).toContain('class="player-content"');
  expect(html).toContain('<h1>player-page-content</h1>');
});

// Workout/onboarding never mount the launcher (KoAccountLink returns null
// there), so they get no clearance — mirroring its gate exactly.
it.each(['/player/workout/day-1', '/player/onboarding'])('does not pad %s, where the launcher never mounts', async (value) => {
  const html = await render(value);
  expect(html).not.toContain('player-content');
  expect(html).toContain('<h1>player-page-content</h1>');
});
