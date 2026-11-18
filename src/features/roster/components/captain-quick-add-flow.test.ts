import type * as React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CaptainFrameNav } from './captain-frame-nav';
import type { QuickAddTarget } from './captain-quick-add-targets';

const state = vi.hoisted(() => ({
  values: [] as unknown[], effects: [] as (() => void | (() => void))[], cursor: 0, path: '/captain',
}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => { state.values[index] = value; }];
  },
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
  useCallback: (callback: unknown) => callback,
  useRef: (initial: unknown) => ({ current: initial }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => state.path }));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key, useLocale: () => 'en' }));
vi.mock('@/core/resource/use-resource', () => ({ useResource: () => ({}) }));
vi.mock('./captain-frame-data', () => ({ loadCaptainFrameCounts: vi.fn() }));
vi.mock('../hooks/use-task-count', () => ({ useTaskCount: () => 0 }));

type ViewProps = { onQuickAdd: () => void; more: ReactElement<{ onAction: (target: QuickAddTarget) => void }> | null };
function view() {
  state.cursor = 0;
  state.effects = [];
  const tree = CaptainFrameNav({ counts: { tasks: 0, inbox: 0, join: 0, billing: null } });
  const [navigation, notice] = Children.toArray(tree.props.children as ReactNode);
  if (!isValidElement<ViewProps>(navigation)) throw new Error('Missing navigation');
  return { nav: navigation.props, notice };
}
function start() {
  view().nav.onQuickAdd();
  const { more } = view().nav;
  if (!more) throw new Error('Missing Quick Add sheet');
  more.props.onAction('/captain/templates');
  return view();
}
beforeEach(() => {
  state.values = []; state.path = '/captain';
  vi.useFakeTimers({ now: new Date('2026-11-18T12:00:00Z') });
  vi.stubGlobal('window', { setTimeout, clearTimeout });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('shows a pending notice and offers the action chooser if navigation never finishes', () => {
  expect(start().notice).toBeDefined();
  const cleanup = state.effects[1]?.();
  vi.advanceTimersByTime(8_000);
  const notice = view().notice;
  if (!isValidElement<{ children: [ReactNode, ReactElement<{ onClick: () => void }>] }>(notice)) throw new Error('Missing fallback');
  expect(notice.props.children[0]).toMatchObject({ props: { role: 'alert', children: 'actionUnavailable' } });
  notice.props.children[1].props.onClick();
  expect(view().nav.more).not.toBeNull();
  cleanup?.();
});

it('offers the fallback if the destination redirects to another page', () => {
  start();
  state.path = '/captain/join';
  view();
  const cleanup = state.effects[1]?.();
  vi.runOnlyPendingTimers();
  expect(view().notice).toMatchObject({ props: { children: [{ props: { role: 'alert' } }, expect.anything()] } });
  cleanup?.();
});

it('focuses and opens the intended action when its button becomes enabled', () => {
  start();
  state.path = '/captain/templates';
  view();
  const button = { disabled: true, focus: vi.fn(), click: vi.fn() };
  const query = vi.fn(() => [button]);
  let update = () => {};
  vi.stubGlobal('document', { getElementById: () => ({ querySelectorAll: query }), querySelector: () => ({}) });
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: () => void) { update = callback; }
    observe() {}
    disconnect() {}
  });
  const cleanup = state.effects[1]?.();
  expect(button.click).not.toHaveBeenCalled();
  expect(query).toHaveBeenCalledWith('button.control-primary');
  button.disabled = false;
  update();
  update();
  expect(button.focus).toHaveBeenCalledOnce();
  expect(button.click).toHaveBeenCalledOnce();
  expect(view().notice).toBeUndefined();
  cleanup?.();
});
