import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { RosterResult, RosterPlayer } from './types';
import { RosterScreen } from './components/roster-screen';

const state = vi.hoisted(() => ({ result: { players: [] } as RosterResult }));
vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof React>(), use: () => [state.result, 'Ali'] }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/features/demo', () => ({ useDemoExpiry: () => null }));
vi.mock('./data/archive-player', () => ({ archivePlayer: vi.fn() }));

const player = (i: number): RosterPlayer => ({ playerId: `player-${i}`, fullName: `Player ${i}`,
  accessUntil: '2026-12-05', startedOn: '2026-11-01', lastTrainingDate: '2026-11-05',
  programTitle: null, openTasks: 0 });
const render = (locale: 'ar' | 'en') => renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(RosterScreen, { data: Promise.resolve<[RosterResult, string]>([state.result, 'Ali']), today: '2026-11-05' })));

it.each(['en', 'ar'] as const)('renders 0, 1, 5 and 50 distinct player rows in %s', locale => {
  for (const count of [0, 1, 5, 50]) {
    state.result = { players: Array.from({ length: count }, (_, i) => player(i)) };
    const html = render(locale);
    expect(html.match(/role="row"/g)?.length ?? 0).toBe(count ? count + 1 : 0);
    for (let i = 0; i < count; i++) expect(html).toContain(`href="/captain/players/player-${i}"`);
    if (!count) expect(html).toContain(locale === 'en' ? 'Send' : 'دعوة');
    if (count) expect(html).toContain('hairline-cells');
  }
});
it('contains a 250-character player name inside the player link’s truncated name', () => {
  const longName = 'م'.repeat(250);
  state.result = { players: [{ ...player(0), fullName: longName }] };
  const html = render('ar');
  expect(html).toContain(longName);
  expect(html).toMatch(/<a[^>]*href="\/captain\/players\/player-0"[^>]*><span class="[^"]*min-w-0[^"]*"><b class="[^"]*truncate[^"]*">م{250}<\/b>/);
});
it.each(['en', 'ar'] as const)('shows an actionable read error in %s', locale => {
  state.result = { error: 'Read failed' };
  const html = render(locale);
  expect(html).toContain('role="alert"');
  expect(html).toContain('Read failed');
  expect(html).toContain(locale === 'en' ? 'Try again' : 'جرّب تاني');
  expect(html).not.toContain('role="table"');
});
