import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { KoFeedback } from './components/ko-feedback';
import { KoMemoryNote } from './components/ko-memory-note';
import { KoMemoryView } from './components/ko-memory-view';
import { KoReplyLearning } from './components/ko-reply-learning';
import type { Entry } from './hooks/use-ko-history';
import { messages } from './messages';

const hooks = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as (() => unknown)[] }));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof React>(),
  useState(initial: unknown) {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: unknown) => {
      hooks.values[index] = typeof value === 'function' ? value(hooks.values[index]) : value;
    }];
  },
  useRef(current: unknown) { return hooks.values[hooks.cursor++] ??= { current }; },
  useEffect: (effect: () => unknown) => { hooks.effects.push(effect); },
  useCallback: (callback: unknown) => callback,
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en') }));
afterEach(() => { hooks.values = []; hooks.effects = []; vi.unstubAllGlobals(); });

function elements(node: ReactNode): { type: unknown; props: Record<string, unknown> }[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [{ type: node.type, props: node.props }, ...elements(node.props.children)];
}

function render(component: () => ReactNode) {
  hooks.cursor = 0;
  hooks.effects = [];
  return elements(component());
}

function click(nodes: ReturnType<typeof elements>, label: string) {
  const control = nodes.find(({ props }) => props['aria-label'] === label || props.children === label);
  expect(control).toBeDefined();
  (control?.props.onClick as () => void)();
}

function mockFetch(body: unknown, status = 200) {
  const fetcher = vi.fn<(_url: string, _init: RequestInit) => Promise<object>>(
    async () => ({ ok: status === 200, json: async () => body }),
  );
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const memory = { id: 'memory-id', text: 'Likes mornings' };
const previous: Entry = { id: 'question', speaker: 'user', text: 'Question', timestamp: 100 };
const entry: Entry = { id: 'reply', speaker: 'ko', text: 'Reply', timestamp: 100 };

it('offers ratings for text answers, reads and shortcuts with no action cards', () => {
  for (const feedbackIntent of ['answer', 'my_workout', 'quick']) {
    expect(elements(KoReplyLearning({ entry: { ...entry, feedbackIntent }, previous, closeSignal: 0 })))
      .toContainEqual(expect.objectContaining({ type: KoFeedback }));
  }
  for (const reply of [entry, previous, { ...entry, feedbackIntent: 'answer', actions: [
    { id: 'card', title: 'Card', detail: '', approval: { expiresAt: 0, expired: () => false, take: () => null } },
  ] }]) {
    expect(elements(KoReplyLearning({ entry: reply, previous, closeSignal: 0 })))
      .not.toContainEqual(expect.objectContaining({ type: KoFeedback }));
  }
});

it('submits a selected reason once and keeps the negative rating selected', () => {
  const fetcher = mockFetch({});
  const view = () => KoFeedback({ id: entry.id, question: 'Question', answer: 'Reply', intent: 'answer', closeSignal: 0 });
  click(render(view), 'Unhelpful reply');
  const panel = render(view);
  expect(panel.some(({ props }) => props.children === 'What went wrong?')).toBe(true);
  click(panel, 'Too long');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1].body))).toMatchObject({
    operation: 'feedback', feedback: { helpful: false, reason: 'long' },
  });
  expect(render(view).find(({ props }) => props['aria-label'] === 'Unhelpful reply')?.props)
    .toMatchObject({ 'aria-pressed': true, disabled: true });
});

it('submits with no reason when the next message is sent', () => {
  const fetcher = mockFetch({});
  let closeSignal = 0;
  const view = () => KoFeedback({ id: entry.id, question: 'Question', answer: 'Reply', intent: 'my_workout', closeSignal });
  click(render(view), 'Unhelpful reply');
  closeSignal += 1;
  render(view);
  hooks.effects.slice(0, 3).forEach(effect => effect());
  const feedback = JSON.parse(String(fetcher.mock.calls[0]?.[1].body)).feedback;
  expect(feedback.helpful).toBe(false);
  expect(feedback).not.toHaveProperty('reason');
});

it('undoes a saved memory optimistically and leaves its deleted row visible', async () => {
  const fetcher = mockFetch({});
  const view = () => KoMemoryNote({ memory });
  click(render(view), 'Undo');
  expect(render(view).some(({ props }) => props.children === 'Deleted.')).toBe(true);
  expect(JSON.parse(String(fetcher.mock.calls[0]?.[1].body))).toEqual({ operation: 'delete', id: memory.id });
  await settle();
  expect(render(view).some(({ props }) => props.children === 'Deleted.')).toBe(true);
});

async function settle() {
  for (let step = 0; step < 8; step++) await Promise.resolve();
}

it.each(['empty', 'error', 'list'] as const)('shows the memory %s state and the relevant controls', async state => {
  const fetcher = mockFetch({ learning: true, memories: state === 'list' ? [memory] : [] }, state === 'error' ? 502 : 200);
  const onCount = vi.fn();
  const view = () => KoMemoryView({ onCount });
  expect(render(view).some(({ props }) => props.role === 'status')).toBe(true);
  hooks.effects[0]?.();
  await settle();
  expect(render(view).some(({ props }) => props.role === (state === 'error' ? 'alert' : 'switch'))).toBe(true);
  const panel = render(view);
  if (state === 'error') {
    expect(panel.some(({ props }) => props.children === 'Try again')).toBe(true);
  } else if (state === 'empty') {
    expect(panel.some(({ props }) => props.children === createT(messages, 'en')('memoryEmpty'))).toBe(true);
    expect(panel.find(({ props }) => props.role === 'switch')?.props['aria-checked']).toBe(true);
  } else {
    expect(panel.some(({ props }) => props.children === memory.text)).toBe(true);
    expect(panel.some(({ props }) => props['aria-label'] === 'Delete')).toBe(true);
    click(panel, 'Delete everything KO remembers');
    const confirmation = render(view);
    expect(confirmation.some(({ props }) => props.children === 'Delete all your KO memories?')).toBe(true);
    const confirm = confirmation.find(({ props }) => props.children === 'Delete');
    (confirm?.props.onClick as () => void)();
    expect(JSON.parse(String(fetcher.mock.calls.at(-1)?.[1].body))).toEqual({ operation: 'deleteAll' });
  }
});
