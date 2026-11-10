import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { KoAccountLink } from './ko-account-link';
import { KoWidget } from '../ko-preview/components/ko-widget';
import { KoPanel } from '../ko-preview/components/ko-panel';
import { messages } from './messages';
import { messages as previewMessages } from '../ko-preview/messages';

const state = vi.hoisted(() => ({ pilot: false, path: '/player', view: 'closed' as 'closed' | 'loading' | 'error' }));
vi.mock('react', async original => {
  const react = await original<typeof ReactModule>();
  return { ...react, useState: (initial: unknown) => {
    const pair = react.useState(initial);
    if (state.view !== 'closed' && typeof initial === 'boolean') return [true, pair[1]];
    if (state.view !== 'closed' && initial && typeof initial === 'object' && 'Component' in initial) {
      return [{ Component: null, failed: state.view === 'error' }, pair[1]];
    }
    return pair;
  } };
});
vi.mock('server-only', () => ({}));
vi.mock('./config', () => ({ koPilotAvailable: () => state.pilot, koTeaserEnabled: () => false }));
vi.mock('next/headers', () => ({ headers: () => new Headers({ 'x-kochivo-path': state.path }), cookies: () => new Map() }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path }));
vi.mock('@/features/ko-feed', () => ({
  KoFeed: () => createElement('div', { 'data-feed': true }), useKoFeedCount: () => 0,
  koFeedMessages: { ar: { badge: '{count}' }, en: { badge: '{count}' } },
}));

beforeEach(() => { state.pilot = false; state.path = '/player'; state.view = 'closed'; });

it('renders nothing for non-pilots', async () => {
  expect(await KoAccountLink({})).toBeNull();
});

it.each(['/player/workout', '/player/workout/day', '/player/onboarding', '/player/onboarding/step'])('hides player KO on %s', async path => {
  state.pilot = true;
  state.path = path;
  expect(await KoAccountLink({ player: true })).toBeNull();
});

it.each([false, true])('renders the gated client widget for a pilot (player=%s)', async player => {
  state.pilot = true;
  const result = await KoAccountLink({ player });
  expect(result?.props).toEqual({ role: player ? 'player' : 'captain' });
  expect(result?.type).not.toBe('a');
});

it.each(['ar', 'en'] as const)('renders account chat, feed and a launcher without dev copy in %s', locale => {
  const render = (child: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(LocaleProvider, { locale }, child));
  const t = createT(previewMessages, locale);
  const launcher = render(createElement(KoWidget, { role: 'player', account: true }));
  const panel = render(createElement(KoPanel, {
    role: 'player', account: true, expression: 'welcome', openerId: 'opener', onExpression() {}, onClose() {},
  }));
  expect(launcher).toContain(t('accountChatTitle'));
  expect(launcher).not.toContain('lucide-hammer');
  expect(launcher).not.toContain('<dialog');
  expect(launcher).toContain('start-[max(1rem,var(--safe-start))]');
  expect(launcher).toContain('bottom-[calc(var(--nav-clearance)+0.5rem)]');
  expect(panel).toContain(t('accountPlayer'));
  expect(panel).toContain(t('mealPhoto'));
  expect(panel.indexOf('data-feed')).toBeLessThan(panel.indexOf('data-ko-chat'));
  for (const html of [launcher, panel]) {
    for (const key of ['chatTitle', 'status', 'soon', 'chatPrivacy'] as const) expect(html).not.toContain(t(key));
    expect(html).not.toMatch(/(?:ml-|mr-|pl-|pr-|text-left)/);
  }
  expect(panel.match(new RegExp(t('context.remove'), 'g'))).toHaveLength(1);
});

it('keeps the client wrapper private and panel and chat out of the launcher imports', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  expect(read('./ko-account-link.tsx')).toContain("import 'server-only'");
  expect(read('./index.ts')).not.toContain('ko-account-widget');
  expect(read('./ko-account-widget.tsx')).toMatch(/lazy\(/);
  const widget = read('../ko-preview/components/ko-widget.tsx');
  expect(widget).toContain("import('./ko-panel')");
  // The urgent-count hook stays in the launcher so the badge shows before first open (T-123).
  expect(widget).not.toMatch(/import\s+\{[^}]*\}\s+from\s+['"].*(?:ko-panel|ko-chat)/);
});

it.each(['ar', 'en'] as const)('provides translated chunk recovery copy in %s', locale => {
  const t = createT(messages, locale);
  const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(KoWidget, {
    role: 'captain', account: true,
    panelMessages: { loading: t('loading'), error: t('loadError'), retry: t('retry'), fallback: t('fallback') },
  })));
  state.view = 'loading';
  expect(render()).toContain(`role="status">${t('loading')}`);
  state.view = 'error';
  const html = render();
  expect(html).toContain(`role="alert">${t('loadError')}`);
  expect(html).toContain(`${t('retry')}</button>`);
  expect(html).toContain('href="/ko"');
  expect(html).toContain(`${t('fallback')}</a>`);
  expect(html).toContain('aria-haspopup="dialog" aria-expanded="true"');
});
