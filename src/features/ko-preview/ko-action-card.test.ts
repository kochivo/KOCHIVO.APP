import { Button } from '@/ui/button';
import { createElement, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as ReactModule from 'react';
import type * as LocaleModule from '@/core/i18n/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createApproval } from './approval';
import { KoActionCard } from './components/ko-action-card';
import type { ActionState } from './hooks/use-ko-actions';
import { KoChat } from './components/ko-chat';
import { KoQuickButtons } from './components/ko-quick-buttons';
import { createT } from '@/core/i18n/messages';

const hooks = vi.hoisted(() => ({ active: false, cursor: 0, values: [] as unknown[], effects: [] as (() => void | (() => void))[], locale: 'ar' as 'ar' | 'en', setClip: undefined as ((clip: Blob) => void) | undefined }));
vi.mock('react', async importOriginal => {
  const original = await importOriginal<typeof ReactModule>();
  return { ...original, useCallback: (callback: () => void, deps: readonly unknown[]) => hooks.active ? callback : original.useCallback(callback, deps),
    useState(initial: unknown) {
      if (!hooks.active) return original.useState(initial);
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? initial() : initial;
      return [hooks.values[index], (value: unknown) => {
        hooks.values[index] = typeof value === 'function' ? value(hooks.values[index]) : value;
      }];
    },
    useRef(initial: unknown) {
      if (!hooks.active) return original.useRef(initial);
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = { current: initial };
      return hooks.values[index];
    },
    useEffect(effect: () => void | (() => void), deps?: readonly unknown[]) {
      if (hooks.active) hooks.effects.push(effect);
      else original.useEffect(effect, deps);
    },
  };
});
vi.mock('@/core/i18n/client', async importOriginal => {
  const original = await importOriginal<typeof LocaleModule>();
  return { ...original,
    useLocale: () => hooks.active ? hooks.locale : original.useLocale(),
    useT: (dictionary: Parameters<typeof createT>[0]) => hooks.active ? createT(dictionary, hooks.locale) : original.useT(dictionary),
  };
});
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('./hooks/use-ko-recorder', () => ({ useKoRecorder: (setClip: (clip: Blob) => void) => {
  hooks.setClip = setClip;
  return { status: 'idle' };
} }));
afterEach(() => { hooks.active = false; hooks.values = []; hooks.effects = []; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function elements(node: ReactNode): { type: unknown; props: Record<string, unknown> }[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [{ type: node.type, props: node.props }, ...elements(node.props.children)];
}

function chat(account = true) {
  vi.spyOn(Date, 'now').mockReturnValue(100);
  hooks.active = true;
  hooks.cursor = 0;
  return elements(KoChat({ role: 'captain', account, context: null }));
}

async function send(text: string) {
  const input = chat().find(element => element.type === 'input');
  (input?.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: text } });
  const form = chat().find(element => element.type === 'form');
  await (form?.props.onSubmit as () => Promise<void>)();
}

it('sends the exact quick-button text with 48px controls', async () => {
  const quick = ['تمرين النهارده', 'أكل النهارده', 'تقدّمي'];
  const fetcher = vi.fn(async () => Response.json({ kind: 'message', text: 'Reply', quick }));
  vi.stubGlobal('fetch', fetcher);
  await send('Help');
  const controls = chat().find(element => element.type === KoQuickButtons);
  const sendQuick = controls?.props.send as (text: string) => void;
  const html = renderToStaticMarkup(createElement(KoQuickButtons, { quick, disabled: false, send: sendQuick }));
  expect(html.match(/<button[^>]*min-h-12[^>]*>/g)).toHaveLength(3);
  const button = elements(KoQuickButtons({ quick, disabled: false, send: sendQuick })).find(element => element.props.children === quick[0]);
  (button?.props.onClick as () => void)();
  expect(fetcher).toHaveBeenLastCalledWith('/api/ko', expect.objectContaining({ body: expect.any(FormData) }));
  const calls = fetcher.mock.calls as unknown as [string, RequestInit][];
  expect((calls.at(-1)?.[1].body as FormData).get('text')).toBe(quick[0]);
});

it('sends only the six prior visible text entries in order within the history budget', async () => {
  const requests: FormData[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    requests.push(init.body as FormData);
    return Response.json({ kind: 'message', text: 'Reply' });
  });
  for (const text of ['One', 'Two', 'Three', 'Four', 'Five']) await send(text);
  expect(JSON.parse(String(requests[4]?.get('history')))).toEqual([
    { role: 'user', text: 'Two' }, { role: 'ko', text: 'Reply' },
    { role: 'user', text: 'Three' }, { role: 'ko', text: 'Reply' },
    { role: 'user', text: 'Four' }, { role: 'ko', text: 'Reply' },
  ]);
  for (let i = 0; i < 4; i++) await send('x'.repeat(500));
  const recent = JSON.parse(String(requests.at(-1)?.get('history'))) as { text: string }[];
  expect(recent.reduce((sum, turn) => sum + turn.text.length, 0)).toBeLessThanOrEqual(2000);
  hooks.values = [];
  await send('New chat');
  expect(requests.at(-1)?.get('history')).toBe('[]');
});

it('contributes only KO’s reply after a voice note without a visible transcript', async () => {
  const requests: FormData[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    requests.push(init.body as FormData);
    return Response.json({ kind: 'message', text: 'Which day?' });
  });
  chat();
  hooks.setClip?.(new Blob(['audio'], { type: 'audio/webm' }));
  await (chat().find(element => element.type === 'form')?.props.onSubmit as () => Promise<void>)();
  await send('Saturday');
  expect(JSON.parse(String(requests[1]?.get('history')))).toEqual([{ role: 'ko', text: 'Which day?' }]);
  expect(requests[1]?.has('audio')).toBe(false);
});

const cards = [
  { id: 'first', title: 'Renew subscription', detail: 'Review the dates', token: 'signed-first' },
  { id: 'second', title: 'Send reminder', detail: '', token: 'signed-second' },
];
const visibleCards = () => chat().filter(element => element.type === KoActionCard);

it.each(['ar', 'en'] as const)('confirms only the selected card and keeps both cards in the log (%s)', async locale => {
  hooks.locale = locale;
  const requests: FormData[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    requests.push(init.body as FormData);
    return Response.json(requests.length === 1 ? { kind: 'message', text: 'Review', actions: cards } : { kind: 'message', text: 'Saved' });
  });
  await send('Change sets');
  expect(chat(false).some(element => element.type === KoActionCard)).toBe(false);
  expect(visibleCards()).toHaveLength(2);
  const row = visibleCards()[0];
  const confirm = row?.props.onConfirm as () => Promise<void>;
  await Promise.all([confirm(), confirm()]);
  expect(requests).toHaveLength(2);
  expect(requests[1]?.get('token')).toBe('signed-first');
  expect(requests[1]?.get('confirm')).toBe('1');
  expect(requests[1]?.get('text')).toBeNull();
  expect(visibleCards()[0]?.props.state).toEqual({ kind: 'done', text: 'Saved' });
  expect(visibleCards()[1]?.props.state).toBeUndefined();
});

it('cancels one card locally without a request', async () => {
  let calls = 0;
  vi.stubGlobal('fetch', async () => { calls++; return Response.json({ kind: 'message', text: 'Review', actions: cards }); });
  await send('Change sets');
  const row = visibleCards()[0];
  (row?.props.onCancel as () => void)();
  expect(calls).toBe(1);
  expect(visibleCards()[0]?.props.state).toEqual({ kind: 'cancelled' });
  expect(visibleCards()[1]?.props.state).toBeUndefined();
});

it('keeps the server error on the card that was confirmed', async () => {
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => (init.body as FormData).has('confirm')
    ? Response.json({ kind: 'message', text: 'The plan changed.' }, { status: 409 })
    : Response.json({ kind: 'message', text: 'Review', actions: cards }));
  await send('Change the plan');
  await (visibleCards()[1]?.props.onConfirm as () => Promise<void>)();
  expect(visibleCards()[0]?.props.state).toBeUndefined();
  expect(visibleCards()[1]?.props.state).toEqual({ kind: 'failed', text: 'The plan changed.' });
});

it('keeps pending cards through another message and confirms the newest one by typing', async () => {
  const requests: FormData[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    requests.push(init.body as FormData);
    return Response.json(requests.length === 1 ? { kind: 'message', text: 'Review', actions: cards } : { kind: 'message', text: 'Reply' });
  });
  await send('Change sets');
  await send('another message');
  await send('نفّذ');
  expect(requests[1]?.get('token')).toBeNull();
  expect(JSON.parse(String(requests[1]?.get('history')))).toEqual([
    { role: 'user', text: 'Change sets' }, { role: 'ko', text: 'Review' },
  ]);
  expect(requests[2]?.get('token')).toBe('signed-second');
  expect(visibleCards()[1]?.props.state).toEqual({ kind: 'done', text: 'Reply' });
});

it('consumes a token only once, including double taps', () => {
  const approval = createApproval('signed', 100);
  expect(approval.take(101)).toBe('signed');
  expect(approval.take(101)).toBeNull();
});

it('expires at exactly ten minutes', () => {
  expect(createApproval('signed', 100).take(600099)).toBe('signed');
  expect(createApproval('signed', 100).take(600100)).toBeNull();
});

it('focuses confirm on appearance and replaces controls when the expiry timer fires', () => {
  hooks.active = true;
  let now = 100;
  let timer: (() => void) | undefined;
  let delay: number | undefined;
  vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, milliseconds) => {
    timer = callback as () => void;
    delay = milliseconds;
    return {} as ReturnType<typeof setTimeout>;
  });
  const approval = createApproval('signed', 100);
  const clock = () => now;
  const render = () => {
    hooks.cursor = 0;
    return elements(KoActionCard({ action: { id: 'id', title: 'Review', detail: '', approval }, number: 1,
      focus: true, busy: false, now: clock, onConfirm() {}, onCancel() {} }));
  };
  const button = render().find(element => (element.type === 'button' || element.type === Button));
  let focused = false;
  (button?.props.ref as { current: { focus(): void } }).current = { focus() { focused = true; } };
  hooks.effects.forEach(effect => effect());
  expect(focused).toBe(true);
  expect(delay).toBe(600000);
  now = 600100;
  timer?.();
  expect(render().some(element => (element.type === 'button' || element.type === Button))).toBe(false);
  expect(render().some(element => element.type === 'p')).toBe(true);
});

it.each(['ar', 'en'] as const)('renders accessible controls and expiry in %s', locale => {
  const render = (now: number, busy = false, state?: ActionState) => renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(KoActionCard, { action: { id: 'id', title: 'Review', detail: 'Before → after', approval: createApproval('signed', 100) },
      number: 1, now: () => now, state, busy, focus: false, onConfirm() {}, onCancel() {} })));
  const html = render(100);
  expect(html).toContain('role="group"');
  expect(html).toContain(locale === 'ar' ? 'نفّذ' : 'Confirm');
  expect(html.match(/<button[^>]*min-h-12[^>]*>/g)).toHaveLength(2);
  expect(html).toContain('Before → after');
  expect(html).toContain('1.');
  expect(html).toContain(locale === 'ar' ? 'dir="rtl"' : 'dir="ltr"');
  expect(render(100, true).match(/disabled=""/g)).toHaveLength(2);
  expect(render(600100)).not.toContain('<button');
  expect(render(600100)).toContain(locale === 'ar' ? 'الطلب ده خلص وقته' : 'This request expired');
  const done = render(600100, false, { kind: 'done', text: 'Saved' });
  expect(done).toContain('text-lime-ink');
  expect(done).toContain('Saved');
  expect(done).not.toContain('<button');
  const cancelled = render(100, false, { kind: 'cancelled' });
  expect(cancelled).toContain(locale === 'ar' ? 'تمام، لغيته.' : 'Cancelled.');
  expect(cancelled).not.toContain('<button');
});
