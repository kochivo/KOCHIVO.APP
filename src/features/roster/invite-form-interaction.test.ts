import { isValidElement } from 'react';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { InviteForm } from './components/invite-form';

const state = vi.hoisted(() => ({ cursor: 0, refCursor: 0, refs: [] as { current: unknown }[], values: [] as unknown[], effects: [] as (() => void)[], focus: vi.fn() }));
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  useId: () => 'invite',
  useRef: () => state.refs[state.refCursor++] ?? (state.refs[state.refCursor - 1] = { current: null }),
  useEffect: (effect: () => void) => state.effects.push(effect),
  useState: <T,>(initial: T | (() => T)) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
    return [state.values[index] as T, (next: T | ((value: T) => T)) => {
      state.values[index] = typeof next === 'function' ? (next as (value: T) => T)(state.values[index] as T) : next;
    }];
  },
}));
vi.mock('@/core/i18n/client', () => ({
  useLocale: () => 'en',
  useT: (messages: { en: Record<string, string> }) => (key: string) => messages.en[key],
}));
vi.mock('server-only', () => ({}));

function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
const save = vi.fn();
function render() {
  state.cursor = 0;
  state.refCursor = 0;
  const tree = nodes(InviteForm({ packages: [], today: '2026-11-18', onSave: save }));
  const form = state.refs[0];
  if (form) form.current = { querySelector: (selector: string) => ({ focus: () => state.focus(selector) }) };
  for (const effect of state.effects.splice(0)) effect();
  return tree;
}
function field(tree: ReturnType<typeof render>, key: string) {
  const input = tree.find(node => node.props.id === `invite-${key}`);
  if (!input) throw new Error(`Missing field ${key}`);
  return input.props;
}
function button(tree: ReturnType<typeof render>, label: string) {
  const buttons = tree.filter(node => node.props.children === label && typeof node.props.onClick === 'function');
  return buttons.map(node => node.props.onClick as () => void);
}
function enter(tree: ReturnType<typeof render>, key: string, value: string) {
  (field(tree, key).onChange as (event: { target: { value: string } }) => void)({ target: { value } });
}
beforeEach(() => { state.values = []; state.refs = []; state.effects = []; vi.clearAllMocks(); });

it('keeps one Continue and links errors to the first invalid fields', () => {
  let tree = render();
  expect(button(tree, 'Continue')).toHaveLength(1);
  button(tree, 'Continue')[0]?.();
  tree = render();
  expect(state.focus).toHaveBeenLastCalledWith('[id="invite-name"]');
  expect(field(tree, 'name').error).toBe('Enter the player’s name.');
  enter(tree, 'name', 'Ali');
  tree = render();
  button(tree, 'Continue')[0]?.();
  tree = render();
  enter(tree, 'price', '100');
  enter(tree, 'paid', '101');
  enter(tree, 'startsOn', '');
  tree = render();
  button(tree, 'Continue')[0]?.();
  tree = render();
  expect(state.focus).toHaveBeenLastCalledWith('[id="invite-paid"]');
  expect(field(tree, 'paid').error).toBe('Enter a whole number from zero to the price.');
  expect(field(tree, 'startsOn').error).toBe('Choose a date from 30 days ago to 60 days ahead.');
  expect(save).not.toHaveBeenCalled();
});

it('returns payment Edit to step two and exposes step headings for programmatic focus', () => {
  let tree = render();
  enter(tree, 'name', 'Ali');
  tree = render();
  button(tree, 'Continue')[0]?.();
  tree = render();
  expect(field(tree, 'step-2').tabIndex).toBe(-1);
  button(tree, 'Continue')[0]?.();
  tree = render();
  expect(state.focus).toHaveBeenLastCalledWith('[id="invite-step-3"]');
  expect(field(tree, 'step-3').tabIndex).toBe(-1);
  expect(button(tree, 'Continue')).toEqual([]);
  button(tree, 'Edit')[1]?.();
  tree = render();
  expect(state.focus).toHaveBeenLastCalledWith('[id="invite-step-2"]');
  expect(button(tree, 'Edit')).toHaveLength(1);
  expect(button(tree, 'Continue')).toHaveLength(1);
});
