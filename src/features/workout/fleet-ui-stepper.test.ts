import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from '@/ui/messages';
import { Stepper } from '@/ui/stepper';

const state = vi.hoisted(() => ({ draft: null as string | null }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => [state.draft, (next: string | null) => { state.draft = next; }],
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'ar') }));
type Input = { onFocus: () => void; onChange: (event: { target: { value: string } }) => void;
  onBlur: () => void; onKeyDown: (event: { key: string; currentTarget: { blur: () => void } }) => void; value: string };
function findInput(node: unknown): ReactElement<Input> | undefined {
  if (Array.isArray(node)) return node.map(findInput).find(Boolean);
  if (!isValidElement<{ children?: unknown }>(node)) return undefined;
  return node.type === 'input' ? node as ReactElement<Input> : findInput(node.props.children);
}
const change = vi.fn();
function input() {
  const found = findInput(Stepper({ label: messages.ar.increase, value: 20, step: 2.5, max: 100, onChange: change }));
  if (!found) throw new Error('Stepper input missing');
  return found.props;
}
beforeEach(() => { state.draft = null; change.mockReset(); });
it.each([['٢٥٫٥', 25.5], ['۲۵,۵', 25.5], ['.5', 0.5], ['105', 100]])('commits typed %s as %s on blur', (typed, expected) => {
  input().onFocus();
  input().onChange({ target: { value: typed } });
  input().onBlur();
  expect(change).toHaveBeenCalledExactlyOnceWith(expected);
  expect(input().value).toBe('20');
});
it.each(['', ' ', 'abc'])('keeps the saved value when input is %j', typed => {
  input().onChange({ target: { value: typed } });
  input().onBlur();
  expect(change).not.toHaveBeenCalled();
});
it('discards a typed edit on Escape before a later blur', () => {
  input().onChange({ target: { value: '٩٩' } });
  input().onKeyDown({ key: 'Escape', currentTarget: { blur() {} } });
  expect(input().value).toBe('20');
  input().onBlur();
  expect(change).not.toHaveBeenCalled();
});
it('commits Enter through the same blur path', () => {
  input().onChange({ target: { value: '٣٠' } });
  input().onKeyDown({ key: 'Enter', currentTarget: { blur: () => input().onBlur() } });
  expect(change).toHaveBeenCalledExactlyOnceWith(30);
});
