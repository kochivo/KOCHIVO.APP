import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { CaptainShell } from './components/captain-shell';
import { createElement } from 'react';

const state = vi.hoisted(() => ({ locale: 'ar' as 'ar' | 'en', count: vi.fn() }));
vi.mock('./data/navigation-count', () => ({ fetchWaitingCount: state.count }));
vi.mock('@/core/i18n/server', () => ({
  getT: () => createT(messages, state.locale),
}));
vi.mock('./components/captain-nav', () => ({ CaptainNav: ({ waitingCount }: { waitingCount?: number | null }) =>
  createElement('span', { 'data-waiting': waitingCount ?? 'unavailable' }) }));
vi.mock('./components/captain-device', () => ({ CaptainDevice: () => createElement('button', { 'data-feedback': true }, 'Feedback') }));
vi.mock('./components/captain-account-menu', () => ({ CaptainAccountMenu: () => null }));
vi.mock('@/features/notifications', () => ({ NotificationBell: () => null }));
vi.mock('@/features/ko-preview/server', () => ({ KoAccountLink: () => null }));

it('uses one desktop gutter and a slim sidebar without capping the main column', async () => {
  const html = renderToStaticMarkup(await CaptainShell({ children: 'Roster content', sidebarFooter: 'Sidebar plan' }));
  expect(html).toContain('w-full min-w-0');
  expect(html).toContain('px-4 pb-4');
  expect(html).toContain('lg:px-0');
  expect(html).toContain('w-60');
  expect(html).toContain('lg:sticky lg:top-0 lg:h-dvh');
  expect(html).toContain('lg:border-e lg:border-line');
  expect(html).toContain('mt-auto');
  expect(html).toContain('Sidebar plan');
  expect(html).toContain('max-w-[1640px]');
  expect(html).not.toContain('rounded-card');
  expect(html).not.toContain('max-w-screen-2xl');
  expect(html).toContain('min-w-0 flex-1');
  expect(html).toMatch(/<main\b[^>]*>Roster content<\/main>/);
});

it('supplies the full waiting count and places desktop feedback inside the sidebar', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.count.mockResolvedValue(8);
  const html = renderToStaticMarkup(await CaptainShell({ children: 'Content' }));
  expect(html).toContain('data-waiting="8"');
  expect(html).toContain('lg:static');
  expect(html).toMatch(/<aside\b[\s\S]*data-feedback[\s\S]*<\/aside>/);
  expect(html).toContain('pb-[calc(var(--page-bottom-clearance)+4rem)]');
  vi.unstubAllEnvs();
});

it('keeps an unavailable count distinct from an empty inbox', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.count.mockResolvedValue(null);
  expect(renderToStaticMarkup(await CaptainShell({ children: null }))).toContain('data-waiting="unavailable"');
  state.count.mockResolvedValue(0);
  expect(renderToStaticMarkup(await CaptainShell({ children: null }))).toContain('data-waiting="0"');
  vi.unstubAllEnvs();
});

it.each(['ar', 'en'] as const)('labels the mobile home link in %s and shows only the mark', async locale => {
  state.locale = locale;
  const html = renderToStaticMarkup(await CaptainShell({ children: null }));
  const links = [...html.matchAll(/<a\b[^>]*href="\/captain"[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0]);
  const mobile = links.find(link => link.includes('lg:invisible'));
  expect(mobile).toBeDefined();
  expect(mobile).toContain(`aria-label="${locale === 'ar' ? 'الرئيسية' : 'Home'}"`);
  expect(mobile).toContain('min-h-12');
  expect(mobile).toContain('<svg');
  expect(mobile).not.toContain('KOCHIVO');
  const desktop = links.find(link => link.includes('lg:flex'));
  expect(desktop).toContain('<svg');
  expect(desktop).toContain('KOCHIVO');
});
