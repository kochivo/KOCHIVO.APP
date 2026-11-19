import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as ReactModule from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { KoChat } from './components/ko-chat';
import { KoMessage } from './components/ko-message';
import { KoPanel } from './components/ko-panel';
import { useKoHistory as historyHook } from './hooks/use-ko-history';
import { messages } from './messages';

const hooks = vi.hoisted(() => ({
  cursor: 0, values: [] as unknown[], effects: undefined as (() => unknown)[] | undefined,
}));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof ReactModule>(),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => unknown) => { hooks.effects?.push(effect); },
  useId: () => 'ko-title',
  useRef(current: unknown) {
    const index = hooks.cursor++;
    return hooks.values[index] ??= { current };
  },
  useState(initial: unknown) {
    const index = hooks.cursor++;
    const values = hooks.values;
    if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], (value: unknown) => {
      values[index] = typeof value === 'function' ? value(values[index]) : value;
    }];
  },
}));
vi.mock('react-dom', () => ({ createPortal: (node: ReactNode) => node }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('./hooks/use-ko-recorder', () => ({ useKoRecorder: () => ({ status: 'idle' }) }));
vi.mock('@/core/i18n/client', () => ({
  useLocale: () => 'ar',
  useT: (dictionary: Parameters<typeof createT>[0]) => createT(dictionary, 'ar'),
}));

function elements(node: ReactNode): { type: unknown; props: Record<string, unknown> }[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [{ type: node.type, props: node.props }, ...elements(node.props.children)];
}

afterEach(() => { hooks.values = []; hooks.effects = undefined; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('merges appends from two hook instances and refreshes each tab on storage events', () => {
  const now = () => 100;
  const key = 'kochivo.ko.chat.player';
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  };
  const tab = () => {
    const values: unknown[] = [];
    const events = new EventTarget();
    const window = Object.assign(events, { localStorage });
    const onClear = vi.fn();
    return {
      render() {
        vi.stubGlobal('window', window);
        hooks.cursor = 0;
        hooks.values = values;
        const effects: (() => unknown)[] = [];
        hooks.effects = effects;
        const history = historyHook('player', {}, onClear, now);
        return { ...history, effects };
      },
      refresh() {
        vi.stubGlobal('window', window);
        events.dispatchEvent(Object.assign(new Event('storage'), { key, newValue: localStorage.getItem(key) }));
      },
    };
  };
  const first = tab();
  const second = tab();
  for (const [instance, id, timestamp] of [[second, 'second', 100], [first, 'first', 99]] as const) {
    const initial = instance.render();
    initial.effects[1]?.();
    initial.setHistory([{ id, speaker: 'user', text: id, timestamp }]);
  }
  second.render().effects[0]?.();
  first.render().effects[0]?.();
  for (const instance of [first, second]) {
    instance.refresh();
    expect(instance.render().history.map(entry => entry.id)).toEqual(['first', 'second']);
  }
});

it('renders saved messages, sends them with a follow-up, and clears the conversation', async () => {
  const now = 100;
  const key = 'kochivo.ko.chat.player';
  const storage = new Map([[key, JSON.stringify([{ speaker: 'user', text: 'Saved question', timestamp: now }])]]);
  vi.stubGlobal('window', { localStorage: { getItem: (key: string) => storage.get(key), removeItem: (key: string) => storage.delete(key) } });
  const render = () => {
    hooks.cursor = 0;
    return elements(KoChat({ account: true, role: 'player', userId: 'player', context: null, header: {} as HTMLElement, now: () => now }));
  };
  const restored = render();
  expect(restored.filter(node => node.type === KoMessage).map(node => node.props.text)).toEqual(['Saved question']);
  expect(restored.some(node => node.props['aria-label'] === messages.ar.suggestions)).toBe(false);
  const fetcher = vi.fn(async (_url: string, request: RequestInit) => {
    expect((request.body as FormData).get('history')).toBe(JSON.stringify([{ role: 'user', text: 'Saved question' }]));
    return Response.json({ kind: 'message', text: 'Follow-up answer' });
  });
  vi.stubGlobal('fetch', fetcher);
  const composer = restored.find(node => node.type === 'input' && node.props.type !== 'file');
  (composer?.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: 'Follow-up' } });
  const form = render().find(node => node.type === 'form');
  await (form?.props.onSubmit as () => Promise<void>)();
  expect(fetcher).toHaveBeenCalledTimes(1);
  const reply = render();
  expect(reply.some(node => node.type === KoMessage && node.props.text === 'Follow-up answer')).toBe(true);
  const clear = reply.find(node => node.props['aria-label'] === 'امسح المحادثة');
  (clear?.props.onClick as () => void)();
  expect(storage.has(key)).toBe(false);
  const empty = render();
  expect(empty.filter(node => node.type === KoMessage).map(node => node.props.text)).toEqual([messages.ar.accountPlayer]);
  expect(empty.some(node => node.props['aria-label'] === messages.ar.suggestions)).toBe(true);
  expect(empty.some(node => node.props['aria-label'] === 'امسح المحادثة')).toBe(false);
});

it('closes the account sheet through its header button', () => {
  hooks.cursor = 0;
  const close = vi.fn();
  const panel = KoPanel({ role: 'player', account: true, expression: 'welcome', onExpression() {}, onClose: close, openerId: 'opener' });
  const button = elements(panel).find(node => node.props['aria-label'] === messages.ar.close);
  expect(button).toBeDefined();
  (button?.props.onClick as () => void)();
  expect(close).toHaveBeenCalledOnce();
});
