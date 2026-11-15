import { createElement } from 'react';
import type * as React from 'react';
import type * as ReactDOM from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WorkspaceRoster } from './roster';
import type { RosterResult } from '../types';

const state = vi.hoisted(() => ({ filter: 'all', result: { players: [{ playerId: 'p', fullName: 'Ali',
  accessUntil: '2026-11-15', startedOn: '2026-11-01', lastTrainingDate: '2026-11-12', programTitle: 'Full body', openTasks: 2 }] } as RosterResult,
  index: 0 }));
vi.mock('react', async original => ({ ...await original<typeof React>(), use: () => [state.result, 'Captain'],
  useState: (initial: unknown) => [state.index++ === 0 ? state.filter : initial, () => {}],
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/ui/page-bar-slot', () => ({ usePageBarTarget: (slot: string) => ({ id: slot }) }));
vi.mock('react-dom', async original => ({ ...await original<typeof ReactDOM>(),
  createPortal: (children: React.ReactNode, target: { id: string }) => createElement('div', { 'data-slot': target.id }, children),
}));
beforeEach(() => { state.index = 0; state.filter = 'all'; });
function render(error = false) {
  state.index = 0;
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(WorkspaceRoster, {
    today: '2026-11-12', data: Promise.resolve<[RosterResult, string]>([state.result, 'Captain']),
    RequestList: () => createElement('p', null, 'Join request sentinel'),
    extras: { free: 4, food: [], meta: { p: { food: false, weight: 82, target: 75, experience: 'new' } },
      requests: [{ id: 'r', full_name: 'Mona', created_at: '2026-11-12', package_id: null, offer_id: null,
        package_days: null, package_sessions: null }] },
    details: error ? { error: true } : { activity: { p: { dates: ['2026-11-12'], weekdays: [0, 2, 4], rpe: 8, video: true, rank: 'champion' } } },
  })));
}
it('renders real player data, weekly dots and the urgent status in both responsive views', () => {
  const html = render();
  expect(html.match(/href="\/captain\/players\/p"/g)).toHaveLength(2);
  expect(html.match(/فيديو مستني/g)).toHaveLength(2);
  expect(html).toContain('82');
  expect(html).toContain('بطل');
  expect(html).toContain('باقي 3 يوم');
  expect(html).toContain('2026-11-12: اتمرن');
  expect(html).toContain('text-warn');
  expect(html).not.toContain('Join request sentinel');
  expect(html).not.toContain('/preview');
});
it('puts the total and lime invite action in the shared bar without a page header', () => {
  const html = render();
  expect(html).toMatch(/data-slot="title"[^>]*><h1[^>]*>اللاعبين 1<\/h1>/);
  expect(html).toMatch(/data-slot="actions"[^>]*><a[^>]*bg-lime[^>]*href="\/captain\/players\/new"/);
  expect(html).toContain('ضيف لاعب');
  expect(html).not.toContain('<header');
});
it.each(['good', 'newPlayers', 'stopped'])('filters the rendered player list for %s and shows its empty state', filter => {
  state.filter = filter;
  const html = render();
  expect(html).not.toContain('href="/captain/players/p"');
  expect(html).toContain('مفيش');
  expect(html).toContain('aria-pressed="true"');
});
it('keeps players with any open task in needs-you even when a video has higher status priority', () => {
  state.filter = 'needsYou';
  expect(render()).toContain('href="/captain/players/p"');
});
it('shows a retryable activity error instead of fabricated week or RPE data', () => {
  const html = render(true);
  expect(html).toContain('role="alert"');
  expect(html).toContain('جرّب تاني');
  expect(html).not.toContain('<table');
});
