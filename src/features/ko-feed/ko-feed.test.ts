import { createElement } from 'react';
import type * as ReactModule from 'react';
import type * as JsxRuntime from 'react/jsx-dev-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { groupFeed, rankFeed, urgentCount } from './rank';
import type { GenerateKind, KoFeedItem, UrgentKind } from './types';
import { snoozeOptimistically } from './data/dismiss';
import { messages } from './messages';
import { KoFeed } from '../ko-preview/components/ko-feed';
import { FeedCard, feedHref } from '../ko-preview/components/feed-card';
import type * as FeedStore from './hooks/use-ko-feed';
import { decideSwap, decideSwapOptimistically } from './data/decide-swap';
import type * as FeedLoader from './data/load-feed';

const state = vi.hoisted(() => ({ rows: [] as KoFeedItem[], status: 'ready' as 'ready' | 'error' | 'loading', saveError: false }));
const loads = vi.hoisted(() => ({ load: vi.fn() }));
const swapRpc = vi.hoisted(() => vi.fn());
const clicks = vi.hoisted(() => ({ capture: false, handlers: new Map<string, () => void>() }));
vi.mock('react/jsx-dev-runtime', async original => {
  const runtime = await original<typeof JsxRuntime>();
  const jsxDEV: typeof runtime.jsxDEV = (type, props, key, isStatic, source, self) => {
    if (clicks.capture && type === 'button' && props && typeof props === 'object') {
      const button = props as { children?: unknown; onClick?: () => void };
      if (typeof button.children === 'string' && button.onClick) clicks.handlers.set(button.children, button.onClick);
    }
    return runtime.jsxDEV(type, props, key, isStatic, source, self);
  };
  return { ...runtime, jsxDEV };
});
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ rpc: swapRpc }) }));
const previewView = vi.hoisted(() => ({ enabled: false, index: 0, reply: null as { text: string; token?: string } | null }));
vi.mock('react', async original => {
  const react = await original<typeof ReactModule>();
  return { ...react, useState: (initial: unknown) => {
    if (!previewView.enabled) return react.useState(initial);
    return [[true, '30', false, false, previewView.reply][previewView.index++], vi.fn()];
  } };
});
vi.mock('./data/load-feed', () => ({ loadFeed: loads.load }));
vi.mock('./hooks/use-ko-feed', () => ({
  refreshFeed: vi.fn(),
  useKoFeed: () => ({ ...state, refresh: vi.fn(), dismiss: vi.fn() }),
  useKoFeedCount: () => state.rows.filter(row => row.severity === 'urgent').length,
}));
beforeEach(() => { state.rows = []; state.status = 'ready'; state.saveError = false; previewView.enabled = false; swapRpc.mockReset(); });

const item = (variant: { kind: UrgentKind; severity: 'urgent' } | { kind: GenerateKind; severity: 'generate' }): KoFeedItem => ({
  key: `${variant.kind}:p:2026-11-03`, ...variant, player_id: 'p', player_name: 'Ali', data: {},
});
it('puts urgent items first without mutating the input', () => {
  const rows = [item({ kind: 'no_program', severity: 'generate' }), item({ kind: 'inactive', severity: 'urgent' }), item({ kind: 'expired', severity: 'urgent' })];
  expect(rankFeed(rows).map(row => row.kind)).toEqual(['expired', 'inactive', 'no_program']);
  expect(rows[0]?.kind).toBe('no_program');
  expect(groupFeed(rows).urgent).toHaveLength(2);
  expect(groupFeed(rows).generate).toHaveLength(1);
});

it.each(['ar', 'en'] as const)('renders swap approval and decline with localized names, injury and direction in %s', locale => {
  const row = { ...item({ kind: 'swap_requested', severity: 'urgent' }), data: {
    request_id: 'request', from: { ar: 'سكوات', en: 'Squat' }, to: { ar: 'بديل', en: 'Alternative' }, injury: 'knee',
  } };
  const t = createT(messages, locale);
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(FeedCard, { item: row, onDismiss() {} })));
  for (const label of [t('approve'), t('decline'), t('knee'), 'Ali', locale === 'ar' ? 'سكوات' : 'Squat']) expect(html).toContain(label);
  expect(html).toContain(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`);
  expect(html).toContain('bg-lime');
  expect(html).not.toContain(t('preview'));
  expect(rankFeed([item({ kind: 'expired', severity: 'urgent' }), row])[0]?.kind).toBe('swap_requested');
});

it.each([true, false])('sends the captain decision %s and restores optimistic state on RPC failure', async approve => {
  let hidden = false;
  let fail: (error: Error) => void = () => {};
  const pending = decideSwapOptimistically('request', approve, value => { hidden = value; },
    () => new Promise<void>((_, reject) => { fail = reject; }));
  expect(hidden).toBe(true);
  fail(new Error('offline'));
  expect(await pending).toBe(false);
  expect(hidden).toBe(false);
  swapRpc.mockResolvedValueOnce({ error: null });
  expect(await decideSwapOptimistically('request', approve, value => { hidden = value; })).toBe(true);
  expect(hidden).toBe(true);
  expect(swapRpc).toHaveBeenLastCalledWith('decide_exercise_swap', { p_id: 'request', p_approve: approve });
  swapRpc.mockResolvedValueOnce({ error: new Error('denied') });
  await expect(decideSwap('request', approve)).rejects.toThrow('denied');
});
it.each([true, false])('wires the visible swap button to approval=%s', async approve => {
  clicks.capture = true; clicks.handlers.clear();
  const row = { ...item({ kind: 'swap_requested', severity: 'urgent' }), data: { request_id: 'request' } };
  renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(FeedCard, { item: row, onDismiss() {} })));
  clicks.capture = false;
  const called = new Promise<void>(resolve => { swapRpc.mockImplementationOnce(async () => { resolve(); return { error: null }; }); });
  const handler = clicks.handlers.get(approve ? 'Approve' : 'Decline');
  expect(handler).toBeTypeOf('function');
  handler?.();
  await called;
  expect(swapRpc).toHaveBeenLastCalledWith('decide_exercise_swap', { p_id: 'request', p_approve: approve });
});

it('accepts swap_requested through the real loader without relaxing other kind validation', async () => {
  const loader = await vi.importActual<typeof FeedLoader>('./data/load-feed');
  const row = { ...item({ kind: 'swap_requested', severity: 'urgent' }), player_id: '00000000-0000-7000-8000-000000000100',
    data: { request_id: 'request', from: { en: 'Source' }, to: { en: 'Target' }, injury: 'knee' } };
  swapRpc.mockResolvedValueOnce({ data: [row], error: null });
  expect(await loader.loadFeed()).toEqual([row]);
  swapRpc.mockResolvedValueOnce({ data: [{ ...row, kind: 'unknown' }], error: null });
  await expect(loader.loadFeed()).rejects.toThrow();
});

it.each(['ar', 'en'] as const)('renders empty, loading, error, grouping and snooze labels in %s', locale => {
  const t = createT(messages, locale);
  const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(KoFeed, {
    avatar: expression => createElement('img', { src: `/ko-preview/${expression}.png`, alt: '' }),
  })));
  expect(render()).toContain(t('empty'));
  expect(render()).toContain('/cheer.png');
  state.status = 'loading';
  expect(render()).toContain(t('loading'));
  state.status = 'error';
  expect(render()).toContain(t('error'));
  expect(render()).toContain(t('retry'));
  state.status = 'ready';
  state.rows = [item({ kind: 'no_program', severity: 'generate' }), item({ kind: 'expired', severity: 'urgent' })];
  const html = render();
  expect(html.indexOf(t('urgent'))).toBeLessThan(html.indexOf(t('generate')));
  expect(html).toContain('/thinking.png');
  expect(html).toContain(t('dismiss'));
  expect(html).toContain(`/${locale}/captain/players/p/programs`);
  expect(html).toContain('text-start');
});

it('counts only urgent tasks and translates the badge announcement', () => {
  expect(urgentCount([])).toBe(0);
  const rows = [item({ kind: 'inactive', severity: 'urgent' }), item({ kind: 'no_program', severity: 'generate' })];
  expect(urgentCount(rows)).toBe(1);
  for (const locale of ['ar', 'en'] as const) expect(createT(messages, locale)('badge', { count: urgentCount(rows) })).toContain('1');
});

it('shows at most five cards initially', () => {
  state.rows = Array.from({ length: 8 }, (_, i) => ({ ...item({ kind: 'no_program', severity: 'generate' }), key: String(i) }));
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(KoFeed, { avatar: () => null })));
  expect(html.match(/<article/g)).toHaveLength(5);
  expect(html).toContain('Show all');
});

it('hides a snoozed card before saving and restores it on failure', async () => {
  const rows = [item({ kind: 'inactive', severity: 'urgent' })];
  let visible = rows;
  let reject: (error: Error) => void = () => {};
  const save = new Promise<void>((_, failure) => { reject = failure; });
  const pending = snoozeOptimistically(() => visible, rows[0]?.key ?? '', next => { visible = next; }, () => save);
  expect(visible).toEqual([]);
  reject(new Error('offline'));
  expect(await pending).toBe(false);
  expect(visible).toEqual(rows);
});

it('preserves cards restored by another failed snooze', async () => {
  const rows = [item({ kind: 'inactive', severity: 'urgent' }), item({ kind: 'no_program', severity: 'generate' })];
  let visible = rows;
  const rejects: ((error: Error) => void)[] = [];
  const requests = rows.map(row => snoozeOptimistically(() => visible, row.key, next => { visible = next; },
    () => new Promise<void>((_, reject) => { rejects.push(reject); })));
  expect(visible).toEqual([]);
  rejects[0]?.(new Error('offline'));
  await requests[0];
  rejects[1]?.(new Error('offline'));
  await requests[1];
  expect(visible).toEqual(rows);
});

it('opens review rather than executing a renewal or reminder on render', () => {
  for (const kind of ['expired', 'expiring', 'inactive'] as const) {
    const row = item({ kind, severity: 'urgent' });
    expect(feedHref(row, 'en')).toBeNull();
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(FeedCard, { item: row, onDismiss() {} })));
    expect(html).toContain('Review with KO');
    expect(html).not.toContain('<form');
  }
});

it.each(['ar', 'en'] as const)('offers a fresh preview after clarification or an expired approval in %s', locale => {
  const t = createT(messages, locale);
  previewView.enabled = true;
  for (const reply of [{ text: 'Clarify the player' }, { text: 'Review renewal', token: 'expired-token' }]) {
    previewView.index = 0;
    previewView.reply = reply;
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(FeedCard, {
      item: item({ kind: 'expiring', severity: 'urgent' }), onDismiss() {},
    })));
    expect(html).toContain(t('restart'));
    expect(html).toContain(reply.text);
    if ('token' in reply) expect(html).toContain(t('confirm'));
  }
  previewView.enabled = false;
});

it('starts a fresh load after remount and ignores obsolete request cleanup', async () => {
  const store = await vi.importActual<typeof FeedStore>('./hooks/use-ko-feed');
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('window', { setInterval: vi.fn(), clearInterval: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
  let oldDone: (rows: KoFeedItem[]) => void = () => {};
  let freshDone: (rows: KoFeedItem[]) => void = () => {};
  loads.load.mockReset();
  loads.load.mockImplementationOnce(() => new Promise<KoFeedItem[]>(resolve => { oldDone = resolve; }))
    .mockImplementationOnce(() => new Promise<KoFeedItem[]>(resolve => { freshDone = resolve; }));
  const stop = store.watchFeed();
  stop();
  const stopFresh = store.watchFeed();
  expect(loads.load).toHaveBeenCalledTimes(2);
  oldDone([]);
  await Promise.resolve(); await Promise.resolve();
  const pending = store.refreshFeed();
  expect(loads.load).toHaveBeenCalledTimes(2);
  const rows = [item({ kind: 'inactive', severity: 'urgent' })];
  freshDone(rows);
  await pending;
  expect(store.getFeedState().rows).toEqual(rows);
  stopFresh();
  vi.unstubAllGlobals();
});
