import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as ReactModule from 'react';

const hooks = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[],
  t: (key: string, values?: Record<string, unknown>) => key + (values ? JSON.stringify(values) : ''), data: undefined as unknown,
}));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => {
      hooks.slots[index] = typeof next === 'function' ? next(hooks.slots[index]) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useEffect: (effect: () => void, deps: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as unknown[] | undefined;
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous[i]))) hooks.effects.push(effect);
    hooks.slots[index] = deps;
  },
  useCallback: (callback: unknown, deps: unknown[]) => {
    const index = hooks.cursor++;
    const previous = hooks.slots[index] as { callback: unknown; deps: unknown[] } | undefined;
    if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) hooks.slots[index] = { callback, deps };
    return (hooks.slots[index] as { callback: unknown }).callback;
  },
  useTransition: () => [false, (action: () => void) => action()],
  use: () => hooks.data,
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => hooks.t, useLocale: () => 'en' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/features/demo', () => ({ useDemoExpiry: () => null }));
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join('');
  return isValidElement<Record<string, unknown>>(value) ? text(value.props.children) : typeof value === 'string' ? value : '';
}
function deferred<T>() {
  let resolve: (result: T) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
beforeEach(() => {
  hooks.slots = []; hooks.cursor = 0; hooks.effects = [];
  vi.clearAllMocks();
  vi.setSystemTime(new Date('2026-11-03T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());

import { InboxScreen } from './components/inbox-screen';
import { InboxRow } from './components/inbox-row';
import { ReplyBox } from './components/reply-box';
import { listInbox, reviewItem } from './data/inbox';
import type { InboxItem } from './types';
vi.mock('./data/inbox', () => ({ listInbox: vi.fn(), reviewItem: vi.fn(), mediaUrls: vi.fn() }));
vi.mock('@/features/voice-notes', () => ({ VoiceRecorder: () => null }));
const items: InboxItem[] = ['a', 'b'].map(id => ({
  kind: 'form', id, player_id: 'p', player_name: id, created_at: '2026-11-03T12:00:00Z',
  reviewed_at: null, reply: null, exercise_name: 'Squat', note: null,
}));
function render() { hooks.cursor = 0; return InboxScreen(); }
async function load(initial = items) {
  vi.mocked(listInbox).mockResolvedValue({ data: initial });
  render(); hooks.effects.splice(0).forEach(effect => effect()); await settle();
}
function rows() { return nodes(render()).filter(node => node.type === InboxRow); }
function select(index: number) { (rows()[index]?.props.onSelect as () => void)(); }
function send() { return nodes(render()).find(node => node.type === ReplyBox)?.props.onSend as (reply: string) => Promise<void>; }
it.each(['error', 'throw'])('closes a reply immediately and restores its open row on %s', async mode => {
  await load(); select(0);
  const request = deferred<{ error: string }>(); vi.mocked(reviewItem).mockReturnValue(request.promise);
  const submit = send(); const operation = submit('Reply'); void submit('Reply');
  expect(reviewItem).toHaveBeenCalledTimes(1);
  expect(rows().map(row => row.props.item)).toEqual([items[1]]);
  expect(nodes(render()).some(node => node.type === ReplyBox)).toBe(false);
  select(0); expect(nodes(render()).some(node => node.type === ReplyBox)).toBe(true);
  if (mode === 'error') request.resolve({ error: 'denied' }); else request.reject(new Error('network'));
  await operation;
  expect(rows().map(row => row.props.item)).toEqual(items);
  expect(nodes(render()).some(node => node.props.role === 'alert')).toBe(true);
  expect((nodes(render()).find(node => node.type === ReplyBox)?.props.item as InboxItem).id).toBe('b');
  select(0);
  expect((nodes(render()).find(node => node.type === ReplyBox)?.props.item as InboxItem).reply).toBe('Reply');
});
it('does not restore another item whose review succeeded', async () => {
  await load(); select(0);
  const first = deferred<{ data: true }>(); const second = deferred<{ error: string }>();
  vi.mocked(reviewItem).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const firstSend = send()(''); select(0); const secondSend = send()('Reply');
  first.resolve({ data: true }); second.resolve({ error: 'denied' }); await Promise.all([firstSend, secondSend]);
  expect(rows().map(row => row.props.item)).toEqual([items[1]]);
});

it('finishes loading when the last row is reviewed during a retry', async () => {
  await load(items.slice(0, 1)); select(0);
  vi.mocked(reviewItem).mockResolvedValueOnce({ error: 'denied' }).mockResolvedValueOnce({ data: true });
  await send()('Reply');
  const reload = deferred<{ data: InboxItem[] }>(); vi.mocked(listInbox).mockReturnValue(reload.promise);
  const retry = nodes(render()).find(node => text(node.props.children) === 'retry');
  (retry?.props.onClick as () => void)();
  await send()('Reply');
  reload.resolve({ data: items.slice(0, 1) }); await settle();
  expect(text(render())).not.toContain('loading');
  expect(rows()).toHaveLength(0);
});

it('shows a pending review on the reviewed tab and removes it after rejection', async () => {
  await load(); select(0);
  const request = deferred<{ error: string }>(); vi.mocked(reviewItem).mockReturnValue(request.promise);
  const operation = send()('Reply');
  const tab = nodes(render()).find(node => node.type === 'button' && text(node.props.children) === 'reviewed');
  expect(tab?.props.disabled).not.toBe(true);
  (tab?.props.onClick as () => void)();
  vi.mocked(listInbox).mockResolvedValue({ data: [] });
  render(); hooks.effects.splice(0).forEach(effect => effect()); await settle();
  expect(rows()).toHaveLength(1);
  expect((rows()[0]?.props.item as InboxItem).reviewed_at).toBe('2026-11-03T12:00:00.000Z');
  request.resolve({ error: 'denied' }); await operation;
  expect(rows()).toHaveLength(0);
  expect(text(render())).toContain('denied');
});

it('keeps a review failure visible when an earlier retry finishes later', async () => {
  await load(); select(0);
  vi.mocked(reviewItem).mockResolvedValue({ error: 'denied' }); await send()('Reply');
  const reload = deferred<{ data: InboxItem[] }>(); vi.mocked(listInbox).mockReturnValue(reload.promise);
  const retry = nodes(render()).find(node => text(node.props.children) === 'retry');
  (retry?.props.onClick as () => void)();
  await send()('Reply');
  expect(text(render())).toContain('denied');
  reload.resolve({ data: items }); await settle();
  expect(text(render())).toContain('denied');
});

