import { Children, isValidElement } from 'react';
import type { DialogHTMLAttributes, ReactElement, ReactNode } from 'react';
import type * as ReactModule from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { Tour } from './tour';
import { Button } from './button';

const state = vi.hoisted(() => ({ index: 0 as number | null, locale: 'en' as 'ar' | 'en',
  states: 0, refs: 0, visible: ['home', 'inbox'], focused: 0,
  effects: [] as (() => void | (() => void))[],
}));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useCallback: (value: unknown) => value,
  useState: () => state.states++ === 0 ? [state.index, (value: number | null) => { state.index = value; }] : [null, () => {}],
  useRef: () => ({ current: state.refs++ === 0 ? { showModal: () => {}, close: () => {} } : {
    querySelectorAll: () => [0, 1, 2].map(index => ({ focus: () => { state.focused = index; } })),
  } }),
  useEffect: (effect: () => void | (() => void)) => { state.effects.push(effect); },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => state.locale,
  useT: (messages: Parameters<typeof createT>[0]) => createT(messages, state.locale) }));
vi.mock('./tour/geometry', () => ({
  visibleTarget: (target: string) => state.visible.includes(target) ? {} : undefined,
  tourGeometry: vi.fn(),
}));
const steps = ['home', 'hidden', 'inbox'].map(target => ({ target, title: target, body: target }));
beforeEach(() => { state.index = 0; state.locale = 'en'; state.visible = ['home', 'inbox']; state.focused = 0; });

function render(onClose = vi.fn()) {
  state.states = 0; state.refs = 0; state.effects = [];
  return Tour({ steps, onClose }) as ReactElement<DialogHTMLAttributes<HTMLDialogElement>>;
}
function buttons(node: ReactNode): ReactElement<{ onClick: () => void; disabled?: boolean; children: string }>[] {
  return Children.toArray(node).flatMap(child => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (child.type === 'button' || child.type === Button) return [child as ReactElement<{ onClick: () => void; children: string }>];
    return buttons(child.props.children);
  });
}

it('next and back navigate past absent targets and Done closes', () => {
  const close = vi.fn();
  const initial = buttons(render(close));
  expect(initial[1]?.props.disabled).toBe(true);
  initial[2]?.props.onClick();
  expect(state.index).toBe(2);
  const last = buttons(render(close));
  expect(last[2]?.props.children).toBe('Done');
  last[1]?.props.onClick(); expect(state.index).toBe(0);
  state.index = 2;
  buttons(render(close))[2]?.props.onClick();
  expect(close).toHaveBeenCalledOnce();
});

it.each(['en', 'ar'] as const)('maps arrow keys to reading direction in %s and Escape skips', locale => {
  state.locale = locale;
  const close = vi.fn();
  const key = (key: string) => render(close).props.onKeyDown?.({ key, preventDefault() {} } as React.KeyboardEvent<HTMLDialogElement>);
  key(locale === 'en' ? 'ArrowRight' : 'ArrowLeft'); expect(state.index).toBe(2);
  key(locale === 'en' ? 'ArrowLeft' : 'ArrowRight'); expect(state.index).toBe(0);
  key('Escape'); expect(close).toHaveBeenCalledOnce();
});

it('wraps Shift+Tab inside the card, including when the card itself has focus', () => {
  vi.stubGlobal('document', { activeElement: null });
  render().props.onKeyDown?.({ key: 'Tab', shiftKey: true, preventDefault() {} } as React.KeyboardEvent<HTMLDialogElement>);
  expect(state.focused).toBe(2);
  vi.unstubAllGlobals();
});

it('Skip closes at every step', () => {
  for (const index of [0, 2]) {
    state.index = index;
    const close = vi.fn(); buttons(render(close))[0]?.props.onClick();
    expect(close).toHaveBeenCalledOnce();
  }
});
