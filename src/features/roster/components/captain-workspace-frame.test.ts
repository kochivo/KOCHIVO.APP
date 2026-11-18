import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainWorkspaceFrame } from './captain-workspace-frame';
import { CaptainNavGroups } from './captain-nav-groups';
import { CaptainSearchPalette } from './captain-search-palette';
import { CaptainMoreSheet } from './captain-more-sheet';
import { CaptainQuickAddSheet } from './captain-quick-add-sheet';
import { CaptainTopBar } from './captain-top-bar';

const state = vi.hoisted(() => ({ load: vi.fn(), path: '/captain/players/id' }));
vi.mock('server-only', () => ({}));
vi.mock('@/features/captain-workspace/server', () => { throw new Error('The layout must not import the task loader'); });
vi.mock('next/navigation', () => ({ usePathname: () => state.path, unstable_rethrow: () => {} }));
vi.mock('./captain-frame-data', () => ({ loadCaptainFrame: state.load }));
vi.mock('@/core/i18n/server', () => ({ getT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar') }));
vi.mock('@/features/notifications', () => ({ NotificationBell: ({ captain }: { captain?: boolean }) => createElement('button', { 'data-captain-bell': captain }) }));
vi.mock('./header-install', () => ({ HeaderInstall: () => createElement('button', { 'data-header-install': true }) }));
vi.mock('./captain-device', () => ({ CaptainDevice: () => createElement('div', { 'data-captain-device': true }) }));
vi.mock('@/features/ko-preview/server', () => ({ KoAccountLink: () => createElement('div', { 'data-ko-account': true }) }));
vi.mock('@/features/billing/server', () => ({ fetchPlanSummary: async () => ({ plan: { tier: 'champion', player_limit: 20 }, used: 7 }) }));
vi.mock('@/core/resource/use-resource', () => ({
  useResource: (key: string) => key === 'captain:phone-more-counts'
    ? { data: { programs: 12, exercises: 1250, plans: 8, foods: 640, forms: 5 } }
    : {},
}));

function render(node: React.ReactNode) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, node));
}
const counts = { tasks: 4, inbox: 3, join: 2, billing: null };

function renderTopBar(path: string) {
  const previous = state.path;
  state.path = path;
  try { return render(createElement(CaptainTopBar, { players: null, bell: null, install: null })); }
  finally { state.path = previous; }
}

it('keeps the desktop page bar layout and confines the single-row layout to phones', () => {
  const html = renderTopBar('/captain/billing/packages');
  const bar = html.match(/data-captain-top-bar="true" class="([^"]+)"/)?.[1]?.split(' ') ?? [];
  expect(bar.filter(token => !token.startsWith('max-md:')).join(' ')).toBe(
    'group/top glass mb-stack flex min-h-16 flex-wrap items-center gap-inline rounded-control border border-line px-inline py-inline',
  );
  expect(bar).toContain('max-md:flex-nowrap');
  expect(bar).toContain('max-md:group-has-[[data-captain-phone-heading]]/page:hidden');
  expect(html).toMatch(/id="page-bar-actions" class="[^"]*max-md:shrink-0 max-md:flex-nowrap/);
  expect(html).toContain('max-md:[&amp;_h1]:truncate');
});

it('renders grouped navigation, real captain identity and the existing plan footer', async () => {
  state.load.mockResolvedValue({ counts, captain: { name: 'Actual captain', avatar: null }, players: [{ id: 'p1', name: 'Actual player' }] });
  const html = render(await CaptainWorkspaceFrame({ children: 'Page content', sidebarFooter: 'Current plan' }));
  for (const text of ['شغلي', 'فريقي', 'مكتبتي', 'فلوسي', 'Actual captain', 'Current plan', 'Page content', 'دور على لاعب أو صفحة', 'Ctrl K']) expect(html).toContain(text);
  expect(html).toContain('الإعدادات والحساب');
  expect(html).toContain('href="/captain/tasks"');
  expect(html).toContain('href="/captain/join"');
  expect(html).not.toContain('href="/captain/notifications"');
  expect(html).toContain('min-[760px]');
  expect(html).toContain('md:sticky md:top-3 md:flex');
  expect(html).toContain('hidden min-[760px]:block max-md:hidden');
  expect(html).toContain('captain-more');
  expect(html).toContain('display: none');
  expect(html).toContain('data-captain-bell="true"');
  expect(html).toContain('data-header-install="true"');
  expect(html).toMatch(/<aside\b[\s\S]*data-captain-device="true"[\s\S]*<\/aside>/);
  expect(html).toContain('data-ko-account="true"');
  expect(html).toContain('group/page min-w-0 flex-1');
  expect(html).toContain('max-md:pb-[calc(var(--nav-clearance)+var(--spacing-touch)+var(--spacing-card))]!');
  expect(html).toMatch(/<button\b[^>]*popovertarget="[^"]+"[^>]*>[\s\S]*Actual captain/i);
  expect(html).toContain('id="page-bar-title"');
  expect(html).toContain('id="page-bar-actions"');
  expect(html).toContain('peer-[:not(:empty)]:hidden');
});

it('keeps failures visible without inventing a name or player count', async () => {
  state.load.mockRejectedValue(new Error('offline'));
  const html = render(await CaptainWorkspaceFrame({ children: 'Page content' }));
  expect(html).toContain('البيانات مش متاحة دلوقتي');
  expect(html).not.toContain('0 لاعب');
});

it('puts only remaining destinations into grouped mobile tiles', () => {
  const html = render(createElement(CaptainNavGroups, { active: 'players', counts, tiles: true }));
  expect(html).toContain('grid-cols-3');
  expect(html).toContain('href="/captain/billing"');
  expect(html).toContain('href="/captain/join"');
  expect(html).not.toContain('href="/captain/players"');
  expect(html).not.toContain('href="/captain/inbox"');
});

it('puts search and notifications in the More header without a second account menu', () => {
  const html = render(createElement(CaptainMoreSheet, { active: 'players', counts, onClose: () => {},
    bell: createElement('button', { 'data-captain-bell': true }) }));
  const header = html.match(/<header[^>]*>.*?<\/header>/)?.[0];
  expect(header).toContain('captain-more-search');
  expect(header).toContain('data-captain-bell');
  expect(html).not.toContain('popovertarget=');
});

it('lists the phone groups, inbox and live plan usage in More', () => {
  const html = render(createElement(CaptainMoreSheet, { active: 'programs', counts, onClose: () => {},
    captain: { name: 'Actual captain', avatar: null }, plan: { tier: 'champion', used: 7, limit: 20 } }));
  expect(html).toContain('Actual captain');
  expect(html).toContain('البطل');
  for (const path of ['inbox', 'join', 'leaderboard', 'templates', 'library/exercises', 'library/meal-plans', 'library/foods', 'library/forms', 'billing', 'billing/packages', 'settings']) {
    expect(html).toContain(`href="/captain/${path}"`);
  }
  expect(html).toMatch(/href="\/captain\/join"[\s\S]*?>2<\/span>/);
  expect(html).toContain('>1,250</span>');
  expect(html).toContain('>640</span>');
  expect(html).toMatch(/<a\b(?=[^>]*href="\/captain\/templates")(?=[^>]*aria-current="page")/);
  expect(html).toContain('divide-y divide-line-soft');
});

it('renders five destination links and the existing assessment flow in quick add', () => {
  const html = render(createElement(CaptainQuickAddSheet, { onClose: () => {}, onAction: () => {}, players: null }));
  expect(html).toContain('عاوز تعمل إيه؟');
  expect(html).toContain('grid-cols-2');
  expect([...html.matchAll(/href="([^"]+)"/g)].map(match => match[1])).toEqual([
    '/captain/players/new', '/captain/billing', '/captain/templates',
    '/captain/library/meal-plans', '/captain/join',
  ]);
  expect(html).toMatch(/<button[^>]*>[\s\S]*ابعت تقييم<\/button>/);
  expect(html.match(/border-lime bg-lime-soft/g)).toHaveLength(1);
});

it('searches real players and available pages and reports player load failure', () => {
  const html = render(createElement(CaptainSearchPalette, { players: [{ id: 'p1', name: 'Actual player' }], onClose: () => {} }));
  expect(html).toContain('href="/captain/players/p1"');
  expect(html).toContain('Actual player');
  expect(html).toContain('/captain/tasks');
  expect(render(createElement(CaptainSearchPalette, { players: null, onClose: () => {} }))).toContain('البيانات مش متاحة دلوقتي');
});
