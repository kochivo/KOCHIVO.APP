import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'en', getT: async () => (key: string) => key }));
import { HomeTiles } from './home-tiles';
import { HomeInvite } from './home-invite';
import { HomeWeekChart } from './home-week-chart';
import { taskProgress } from './tasks';

it('never claims 100% progress from an empty day', () => {
  expect(taskProgress(0, 0)).toBe(0);
  expect(taskProgress(3, 7)).toBe(0.3);
  expect(taskProgress(1, 1)).toBe(0.5);
  expect(taskProgress(0, 20)).toBe(0);
});

it.each([[undefined, null], [0, null], [2000, 25], [100, 100]] as const)(
  'renders thin revenue progress only with a real positive goal %s', async (incomeGoal, percent) => {
    const html = renderToStaticMarkup(await HomeTiles({ adherence: 0, previous: 0, trained: 0, active: 0,
      pending: 0, paid: 500, progress: 0, incomeGoal }));
    const tile = html.slice(html.indexOf('href="/captain/billing"')).split('</div>')[0];
    if (percent !== null) {
      expect(tile).toContain(`aria-valuenow="${percent}"`);
      expect(tile).toContain('h-1');
    } else expect(tile).not.toContain('role="progressbar"');
  },
);
it('renders exactly one KO plus icon in the home invite action', () => {
  const html = renderToStaticMarkup(createElement(HomeInvite, { name: 'Captain', label: 'Invite' }));
  expect(html.match(/<svg\b/g)).toHaveLength(1);
  expect(html.match(/control-primary/g)).toHaveLength(1);
  expect(html).toContain('href="/captain/players/new"');
  expect(html).toContain('data-tour="invite-player"');
});

it('marks today and distinguishes past bars from future stubs', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  try {
    const today = '2026-11-18';
    const html = renderToStaticMarkup(await HomeWeekChart({ today, sessions: [
      { date: '2026-11-17' }, { date: today }, { date: today },
    ] }));
    expect(html).toMatch(/>1<\/span><span class="[^"]*bg-lime\/35" style="height:40px"/);
    expect(html).toMatch(/aria-current="date"[^>]*>.*?>2<\/span><span class="[^"]*bg-lime" style="height:80px"/);
    expect(html.match(/bg-line-soft" style="height:4px"/g)).toHaveLength(2);
    expect(html).toContain('font-bold text-ink">wednesday');
  } finally {
    vi.unstubAllEnvs();
  }
});
