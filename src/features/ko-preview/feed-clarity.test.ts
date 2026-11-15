import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import type * as FeedModule from '@/features/ko-feed';
import type { KoFeedItem } from '@/features/ko-feed';
import { LocaleProvider } from '@/core/i18n/client';
import { KoFeed } from './components/ko-feed';
import { KoPanel } from './components/ko-panel';
import { KoConfirm, createApproval } from './components/ko-confirm';

const state = vi.hoisted(() => ({ rows: [] as KoFeedItem[] }));
vi.mock('next/navigation', () => ({ usePathname: () => '/player' }));
vi.mock('@/features/ko-feed', async original => ({ ...await original<typeof FeedModule>(),
  useKoFeed: () => ({ rows: state.rows, status: 'ready', saveError: false, refresh() {}, dismiss() {} }),
}));
afterEach(() => vi.unstubAllEnvs());
const swap = (key: string): KoFeedItem => ({ key, player_id: 'p', player_name: 'Player', severity: 'urgent', kind: 'swap_requested',
  data: { request_id: key, from: { en: 'Squat' }, to: { en: 'Press' } } });
function approvals() {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(KoFeed, { avatar: () => null })));
  return html.match(/<button[^>]*>Approve<\/button>/g) ?? [];
}
it('keeps lime on only the first approval across several actionable cards', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.rows = [{ key: 'other', player_id: 'p', player_name: 'Player', severity: 'urgent', kind: 'expired', data: {} }, swap('first'), swap('second')];
  const buttons = approvals();
  expect(buttons).toHaveLength(2);
  expect(buttons[0]).toContain('control-primary');
  expect(buttons[1]).toContain('control-secondary');
  expect(buttons[1]).not.toContain('control-primary');
});
it('retains the legacy approval appearance with the workspace flag off', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  state.rows = [swap('first'), swap('second')];
  for (const button of approvals()) {
    expect(button).toContain('control-primary');
    expect(button).toContain('control-primary');
  }
});
it('keeps chat send secondary beside the first lime feed approval', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.rows = [swap('first'), swap('second')];
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(KoPanel, {
    role: 'player', expression: 'welcome', onExpression() {}, onClose() {}, openerId: 'ko', interactive: true,
  })));
  expect(html.match(/<button[^>]*\bcontrol-primary(?:[ "])[^>]*>/g)).toHaveLength(1);
});
it('keeps chat confirmation secondary beside the feed approval', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.rows = [swap('first')];
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement('div', null,
    createElement(KoFeed, { avatar: () => null }), createElement(KoConfirm, {
      approval: createApproval('token', 0), now: () => 0, busy: false, onConfirm() {}, onCancel() {},
    }))));
  expect(html.match(/<button[^>]*\bcontrol-primary(?:[ "])[^>]*>/g)).toHaveLength(1);
});
