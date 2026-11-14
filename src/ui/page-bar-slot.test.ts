import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { pageBarTargets, subscribePageBarTargets, usePageBarTarget } from './page-bar-slot';
import { PageBarTitle } from './page-bar-title';
import { PageBarActions } from './page-bar-actions';

const state = vi.hoisted(() => ({ client: false, portal: vi.fn() }));
vi.mock('react', async importOriginal => {
  const original = await importOriginal<typeof ReactModule>();
  return { ...original, useSyncExternalStore: (_: unknown, snapshot: () => unknown, server: () => unknown) => state.client ? snapshot() : server() };
});
vi.mock('react-dom', () => ({ createPortal: (children: unknown, target: unknown) => { state.portal(children, target); return children; } }));
afterEach(() => { state.client = false; state.portal.mockClear(); vi.unstubAllGlobals(); });

it('renders nothing during SSR or without a top bar', () => {
  expect(renderToStaticMarkup(createElement(PageBarTitle, { title: 'Page title' }))).toBe('');
  expect(renderToStaticMarkup(createElement(PageBarActions, null, 'Action'))).toBe('');
  state.client = true;
  vi.stubGlobal('document', { getElementById: () => null });
  expect(renderToStaticMarkup(createElement(PageBarTitle, { title: 'Page title' }))).toBe('');
  expect(state.portal).not.toHaveBeenCalled();
});

it('portals a title and optional subtitle and actions into their own targets', () => {
  state.client = true;
  const title = { id: pageBarTargets.title }, actions = { id: pageBarTargets.actions };
  vi.stubGlobal('document', { getElementById: (id: string) => id === title.id ? title : actions });
  const html = renderToStaticMarkup(createElement(PageBarTitle, { title: 'Player file', subtitle: 'Active players' }));
  expect(html).toContain('<h1'); expect(html).toContain('Player file'); expect(html).toContain('Active players');
  expect(state.portal).toHaveBeenLastCalledWith(expect.anything(), title);
  expect(renderToStaticMarkup(createElement(PageBarActions, null, createElement('button', null, 'Invite')))).toContain('<button>Invite</button>');
  expect(state.portal).toHaveBeenLastCalledWith(expect.anything(), actions);
  expect(renderToStaticMarkup(createElement(PageBarTitle, { title: 'Title only' }))).not.toContain('<p');
});

it('observes target insertion, replacement and removal, and disconnects on cleanup', () => {
  const changed = vi.fn(), disconnect = vi.fn(), observe = vi.fn();
  let mutation = () => {};
  vi.stubGlobal('document', { documentElement: {} });
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: () => void) { mutation = callback; }
    observe = observe;
    disconnect = disconnect;
  });
  const cleanup = subscribePageBarTargets(changed);
  mutation(); mutation(); mutation();
  expect(changed).toHaveBeenCalledTimes(3);
  expect(observe).toHaveBeenCalledWith(document.documentElement, { childList: true, subtree: true });
  cleanup(); expect(disconnect).toHaveBeenCalledOnce();
});

it('resolves the current target after a route replaces the top bar', () => {
  state.client = true;
  let current: { id: string } | null = { id: 'first' };
  vi.stubGlobal('document', { getElementById: () => current });
  function Probe() { return createElement('span', null, usePageBarTarget('title')?.id); }
  expect(renderToStaticMarkup(createElement(Probe))).toContain('first');
  current = { id: 'second' };
  expect(renderToStaticMarkup(createElement(Probe))).toContain('second');
  current = null;
  expect(renderToStaticMarkup(createElement(Probe))).toBe('<span></span>');
});
