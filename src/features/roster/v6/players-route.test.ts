import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PlayersPage from '@/app/[locale]/(captain)/captain/players/page';

vi.mock('@/core/timezone/server', () => ({ getTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/features/roster', () => ({
  fetchRoster: async () => ({ players: [] }), fetchCaptainFirstName: async () => 'Captain',
  RosterScreen: () => createElement('div', { 'data-roster': true }),
}));
vi.mock('@/ui', () => ({ LoadingState: () => null }));
vi.mock('@/features/coach-page', () => ({ JoinRequests: () => createElement('div', { 'data-requests': true }) }));
vi.mock('@/features/rank-review', () => ({ TeamCrownLink: () => createElement('a', { href: '/captain/leaderboard' }) }));
vi.mock('@/lib/ranks-enabled', () => ({ ranksEnabled: () => true }));
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-14T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

it('shows only the roster on the workspace players route', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = renderToStaticMarkup(await PlayersPage());
  expect(html).toContain('data-roster');
  expect(html).not.toContain('data-requests');
  expect(html).not.toContain('/captain/leaderboard');
});
it.each([undefined, '0'])('preserves crown, roster and requests in order with flag %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  expect(renderToStaticMarkup(await PlayersPage()))
    .toMatch(/href="\/captain\/leaderboard".*data-roster.*data-requests/);
});
