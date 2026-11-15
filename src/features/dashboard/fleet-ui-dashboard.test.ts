import { createElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import type { RosterPlayer, RosterResult } from '@/features/roster';
import { DashboardScreen } from './components/dashboard-screen';

const state = vi.hoisted(() => ({ locale: 'en' as 'ar' | 'en' }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => state.locale,
  getT: async (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, state.locale) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/features/roster/data/radar', () => ({ fetchRadar: vi.fn() }));

async function render(result: RosterResult) {
  const element = await DashboardScreen({ data: Promise.resolve([result, 'Ali', new Map()]), today: '2026-11-05',
    plan: createElement('span', null, 'Plan slot'),
    joinRequests: createElement('section', null, 'Requests slot'), coachLink: createElement('section', null, 'Link slot') });
  return new Response(await renderToReadableStream(createElement(LocaleProvider, { locale: state.locale }, element))).text();
}
it.each(['ar', 'en'] as const)('renders fleet counts and recovery actions in %s', async locale => {
  state.locale = locale;
  for (const count of [0, 1, 5, 50]) {
    const players: RosterPlayer[] = Array.from({ length: count }, (_, i) => ({ playerId: `p-${i}`,
      fullName: `Player ${i}`, accessUntil: '2026-12-05', startedOn: '2026-11-01',
      lastTrainingDate: '2026-11-05', programTitle: 'Program', openTasks: 0 }));
    const html = await render({ players });
    expect(html).toContain('Ali');
    expect(html).not.toContain('role="alert"');
    expect(html).toContain('Requests slot');
    expect(html).toContain('<div class="min-w-0 lg:hidden"><span>Plan slot</span></div>');
    if (!count) {
      expect(html).toContain('data-tour="invite-player"');
      expect(html).toContain('lg:grid-cols-4');
      expect(html.match(/text-4xl/g)).toHaveLength(4);
      expect(html.match(/text-4xl[^>]*>0<\/p>/g)).toHaveLength(4);
      expect(html.match(/<a[^>]*bg-lime/g)).toHaveLength(1);
      expect(html).toContain('href="/captain/players/new"');
      expect(html).toContain('data-tour="captain-home"');
      expect(html).toContain('lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]');
      const steps = [...html.matchAll(/<li\b[\s\S]*?<\/li>/g)].map(match => match[0]);
      expect(steps).toHaveLength(3);
      expect(steps[0]).toContain(locale === 'en' ? 'Add your first player' : 'ضيف أول لاعب ليك');
      expect(steps[1]).toContain(locale === 'en' ? 'Choose a program' : 'اختار له برنامج');
      expect(steps[2]).toContain(locale === 'en' ? 'Set a meal plan' : 'حدد خطة الأكل');
      expect(html).toMatch(/<div class="min-w-0 space-y-6"><section>Link slot<\/section><section>Requests slot<\/section><\/div>/);
    }
    else {
      expect(html).not.toContain('Link slot');
      expect(html.indexOf('Requests slot')).toBeLessThan(html.indexOf(locale === 'en' ? 'Find a player' : 'دوّر على لاعب'));
      expect(html).toMatch(new RegExp(`text-4xl[^>]*>${count}</p>`));
      expect(html).toContain('lg:grid-cols-4');
      expect(html).toContain('lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]');
      expect(html).toContain('min-w-0 space-y-6');
      expect(html).toContain('min-w-0 space-y-4 p-5');
    }
  }
});
it.each(['ar', 'en'] as const)('does not render misleading counts on read failure in %s', async locale => {
  state.locale = locale;
  const html = await render({ error: 'Read failed' });
  expect(html).toContain('role="alert"');
  expect(html).not.toContain('text-4xl');
});
