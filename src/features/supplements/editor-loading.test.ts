import { createElement } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { CaptainSupplements } from './components/captain-supplements';

const state = vi.hoisted(() => ({ cursor: 0, slots: [] as unknown[], imports: 0,
  pending: undefined as Promise<unknown> | undefined, editor: undefined as Record<string, unknown> | undefined }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = initial;
    return [state.slots[index], (value: unknown) => { state.slots[index] = value; }];
  },
  useEffect: () => {}, useCallback: (callback: unknown) => callback,
}));
vi.mock('@/core/i18n', () => ({ useT: () => createT(messages, 'en') }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: undefined, status: 'idle', retry: async () => {} }) }));
vi.mock('./data/captain', () => ({}));
vi.mock('./components/supplement-editor', () => {
  state.imports++;
  return { SupplementEditor: (props: Record<string, unknown>) => { state.editor = props; return null; } };
});
vi.mock('next/dynamic', () => ({ default: (loader: () => Promise<unknown>) => (props: Record<string, unknown>) => {
  state.pending = loader(); state.editor = props;
  return createElement('div', { 'data-editor': 'open' });
} }));
function button(node: unknown, label: string): (() => void) | undefined {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) { const click = button(child, label); if (click) return click; }
    return;
  }
  const element = node as { type?: unknown; props?: { children?: unknown; onClick?: () => void } };
  if (element.type === 'button' && element.props?.children === label) return element.props.onClick;
  return button(element.props?.children, label);
}
const render = () => {
  state.cursor = 0;
  return CaptainSupplements({ playerId: 'player' });
};
it('loads the editor only after Add and keeps close and draft props intact', async () => {
  const initial = render();
  renderToStaticMarkup(initial);
  expect(state.imports).toBe(0);
  expect(state.pending).toBeUndefined();
  const add = button(initial, createT(messages, 'en')('add'));
  expect(add).toBeTypeOf('function');
  add?.();
  expect(renderToStaticMarkup(render())).toContain('data-editor="open"');
  await state.pending;
  expect(state.imports).toBe(1);
  expect(state.editor?.initial).toBeNull();
  expect(state.editor?.onSave).toBeTypeOf('function');
  const close = state.editor?.onClose;
  expect(close).toBeTypeOf('function');
  if (typeof close === 'function') close();
  expect(renderToStaticMarkup(render())).not.toContain('data-editor="open"');
});
