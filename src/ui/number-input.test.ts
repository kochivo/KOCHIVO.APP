import { afterEach, expect, it, vi } from 'vitest';
import type { InputHTMLAttributes } from 'react';
import { NumberInput } from './number-input';

const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock('react', () => ({
  useId: () => 'number',
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (next: unknown) => { state.values[index] = next; }];
  },
}));
afterEach(() => { state.values = []; });

function field(value: number | null = 7, allowEmpty = false, min = 1, max = 20) {
  const commit = vi.fn();
  const render = () => {
    state.cursor = 0;
    return NumberInput({ value, allowEmpty, onCommit: commit, min, max }).props as InputHTMLAttributes<HTMLInputElement>;
  };
  return { render, commit };
}
function focus(props: InputHTMLAttributes<HTMLInputElement>) {
  const select = vi.fn();
  props.onFocus?.({ currentTarget: { select } } as never);
  expect(select).toHaveBeenCalledOnce();
}
it.each(['12', '١٢'])('allows clearing and commits %s only on blur', text => {
  const { render, commit } = field();
  focus(render());
  render().onChange?.({ target: { value: '' } } as never);
  expect(render().value).toBe('');
  expect(commit).not.toHaveBeenCalled();
  render().onChange?.({ target: { value: text } } as never);
  render().onBlur?.({} as never);
  expect(commit).toHaveBeenCalledWith(12);
});
it.each([false, true])('restores empty input, allowing null: %s', allowEmpty => {
  const { render, commit } = field(7, allowEmpty);
  focus(render());
  render().onChange?.({ target: { value: '' } } as never);
  expect(render().value).toBe('');
  render().onBlur?.({} as never);
  expect(commit).toHaveBeenCalledWith(allowEmpty ? null : 7);
});
it.each([['0', 1], ['99', 20], ['1.', 1]])('clamps %s on commit', (text, expected) => {
  const { render, commit } = field();
  focus(render());
  render().onChange?.({ target: { value: text } } as never);
  expect(render().value).toBe(text);
  render().onBlur?.({} as never);
  expect(commit).toHaveBeenCalledWith(expected);
});
it('does not write a rounded display value when focus leaves without an edit', () => {
  const { render, commit } = field(3.33);
  focus(render()); render().onBlur?.({} as never);
  expect(commit).not.toHaveBeenCalled();
});
it('commits on Enter and prevents form submission', () => {
  const { render, commit } = field();
  focus(render()); render().onChange?.({ target: { value: '12' } } as never);
  const preventDefault = vi.fn();
  render().onKeyDown?.({ key: 'Enter', preventDefault, currentTarget: {
    blur: () => render().onBlur?.({} as never),
  } } as never);
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(commit).toHaveBeenCalledWith(12);
});
it('reflects outside values when unfocused and preserves active typing', () => {
  let value = 7;
  const render = () => { state.cursor = 0; return NumberInput({ value, onCommit() {} }).props as InputHTMLAttributes<HTMLInputElement>; };
  expect(render().value).toBe('7');
  value = 9; expect(render().value).toBe('9');
  focus(render()); render().onChange?.({ target: { value: '1.' } } as never);
  value = 10; expect(render().value).toBe('1.');
});
