import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { WelcomeFlow } from './components/welcome-flow';

const state = vi.hoisted(() => ({ values: [1, '', false, 'player'] as unknown[], index: 0, effects: [] as (() => void | (() => void))[],
  history: { state: {} as Record<string, unknown>, pushState: vi.fn(), replaceState: vi.fn(), back: vi.fn() },
  assign: vi.fn(), add: vi.fn(), remove: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => { const index = state.index++; return [state.values[index], (value: unknown) => { state.values[index] = value; }]; },
  useRef: () => ({ current: null }), useEffect: (effect: () => void) => { state.effects.push(effect); },
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'ar'), useLocale: () => 'ar' }));

type Node = ReactElement<{ children?: unknown; href?: string; onClick?: () => void; onSubmit?: (event: { preventDefault: () => void }) => void }>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Node['props']>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render() { state.index = 0; state.effects = []; return nodes(WelcomeFlow()); }
function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(text).join('');
  return isValidElement<Node['props']>(value) ? text(value.props.children) : '';
}
beforeEach(() => {
  vi.clearAllMocks(); state.values = [1, '', false, 'player']; state.history.state = {};
  state.history.pushState.mockImplementation((value: Record<string, unknown>) => { state.history.state = value; });
  state.history.replaceState.mockImplementation((value: Record<string, unknown>) => { state.history.state = value; });
  vi.stubGlobal('window', { history: state.history, location: { assign: state.assign, hash: '', pathname: '/welcome', search: '' }, addEventListener: state.add,
    removeEventListener: state.remove, matchMedia: () => ({ matches: true }) });
});
afterEach(() => vi.unstubAllGlobals());

it('renders the exact slogan and pushes the role and player steps', () => {
  let tree = render();
  expect(tree.some(node => text(node.props.children) === 'YOUR NEXT MOVE STARTS HERE.')).toBe(true);
  tree.find(node => text(node.props.children) === 'يلا نبدأ')?.props.onClick?.();
  expect(state.values[0]).toBe(2);
  expect(state.history.pushState).toHaveBeenLastCalledWith({ welcomeStep: 2 }, '');
  tree = render();
  tree.find(node => text(node.props.children).includes('كمّل') && node.props.onClick)?.props.onClick?.();
  expect(state.values[0]).toBe(3);
  expect(state.history.pushState).toHaveBeenLastCalledWith({ welcomeStep: 3 }, '');
});

it('selects captain before Continue, and has no demo link', () => {
  state.values[0] = 2;
  const tree = render();
  const cards = tree.filter(node => 'description' in node.props);
  cards[1]?.props.onClick?.();
  expect(state.assign).not.toHaveBeenCalled();
  render().find(node => text(node.props.children).includes('كمّل') && node.props.onClick)?.props.onClick?.();
  expect(state.assign).toHaveBeenCalledWith('/login?tab=signup');
  expect(tree.filter(node => node.props.href).map(node => node.props.href)).toEqual(['/login?tab=login']);
});

it('submits an invite link and leaves invalid input on the form', () => {
  state.values = [3, 'https://kochivo.app/i/Ab_c-12', false];
  render().find(node => node.type === 'form')?.props.onSubmit?.({ preventDefault() {} });
  expect(state.assign).toHaveBeenCalledWith('/i/Ab_c-12');
  state.values[1] = 'junk link!'; state.assign.mockClear();
  render().find(node => node.type === 'form')?.props.onSubmit?.({ preventDefault() {} });
  expect(state.assign).not.toHaveBeenCalled();
  expect(state.values[2]).toBe(true);
});

it('restores steps on phone back and removes its history listener', () => {
  render();
  const cleanup = state.effects[0]?.();
  const restore = state.add.mock.calls[0]?.[1] as () => void;
  state.history.state = { welcomeStep: 2 }; restore(); expect(state.values[0]).toBe(2);
  state.history.state = {}; restore(); expect(state.values[0]).toBe(1);
  if (typeof cleanup === 'function') cleanup();
  expect(state.remove).toHaveBeenCalledWith('popstate', restore);
});

it('opens the invite step from the login footer hash', () => {
  window.location.hash = '#code';
  render(); state.effects[0]?.();
  expect(state.values[0]).toBe(3);
  expect(state.history.pushState.mock.calls).toEqual([
    [{ welcomeStep: 2 }, '', '/welcome'], [{ welcomeStep: 3 }, '', '/welcome#code'],
  ]);
});
