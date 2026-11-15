import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'en', getT: async () => (key: string) => key }));
import { HomeTiles } from './home-tiles';
import { HomeInvite } from './home-invite';

it.each([[undefined, null], [0, null], [2000, '25 100'], [100, '100 100']] as const)(
  'renders revenue progress with goal %s', async (incomeGoal, dash) => {
    const html = renderToStaticMarkup(await HomeTiles({ adherence: 0, previous: 0, trained: 0, active: 0,
      pending: 0, paid: 500, progress: 0, incomeGoal }));
    const tile = html.slice(html.indexOf('href="/captain/billing"'));
    expect(tile).toContain('stroke-ink/10');
    if (dash) expect(tile).toContain(`stroke-dasharray="${dash}"`);
    else expect(tile).not.toContain('stroke-dasharray');
  },
);
it('renders exactly one KO plus icon in the home invite action', () => {
  const html = renderToStaticMarkup(createElement(HomeInvite, { name: 'Captain', label: 'Invite' }));
  expect(html.match(/<svg\b/g)).toHaveLength(1);
  expect(html).toContain('href="/captain/players/new"');
  expect(html).toContain('data-tour="invite-player"');
});
