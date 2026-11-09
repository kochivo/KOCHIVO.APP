import { createElement, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as ReactModule from 'react';
import type * as LocaleModule from '@/core/i18n/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { KoConfirm, createApproval } from './components/ko-confirm';
import { KoChat } from './components/ko-chat';
import { createT } from '@/core/i18n/messages';

const hooks = vi.hoisted(() => ({ active: false, cursor: 0, values: [] as unknown[], effects: [] as (() => void | (() => void))[], locale: 'ar' as 'ar' | 'en' }));
vi.mock('react', async importOriginal => {
  const original = await importOriginal<typeof ReactModule>();
  return { ...original,
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
vi.mock('./hooks/use-ko-recorder', () => ({ useKoRecorder: () => ({ status: 'idle' }) }));
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

it.each(['ar', 'en'] as const)('shows only account confirmations and sends the signed form once (%s)', async locale => {
  hooks.locale = locale;
  const requests: FormData[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    requests.push(init.body as FormData);
    return Response.json(requests.length === 1 ? { kind: 'confirm', text: 'Review', token: 'signed' } : { kind: 'message', text: 'Saved' });
  });
  await send('Change sets');
  expect(chat(false).some(element => element.type === KoConfirm)).toBe(false);
  const row = chat().find(element => element.type === KoConfirm);
  expect(row).toBeDefined();
  const confirm = row?.props.onConfirm as () => void;
  confirm(); confirm();
  expect(requests).toHaveLength(2);
  expect(requests[1]?.get('token')).toBe('signed');
  expect(requests[1]?.get('text')).toBe(locale === 'ar' ? 'نفّذ' : 'Confirm');
  expect(chat().some(element => element.type === KoConfirm)).toBe(false);
  await Promise.resolve();
});

it('cancel adds a local reply and removes approval without a request', async () => {
  let calls = 0;
  vi.stubGlobal('fetch', async () => { calls++; return Response.json({ kind: 'confirm', text: 'Review', token: 'signed' }); });
  await send('Change sets');
  const row = chat().find(element => element.type === KoConfirm);
  (row?.props.onCancel as () => void)();
  expect(calls).toBe(1);
  expect(chat().some(element => element.type === KoConfirm)).toBe(false);
  expect(chat().some(element => element.props.text === (hooks.locale === 'ar' ? 'تمام، لغيته.' : 'Cancelled.'))).toBe(true);
  expect((row?.props.approval as ReturnType<typeof createApproval>).take(0)).toBeNull();
});

it.each(['نفّذ', 'another message'])('clears the row on sending %s and preserves typed approval', async text => {
  const requests: FormData[] = [];
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    requests.push(init.body as FormData);
    return Response.json(requests.length === 1 ? { kind: 'confirm', text: 'Review', token: 'signed' } : { kind: 'message', text: 'Reply' });
  });
  await send('Change sets');
  await send(text);
  expect(requests[1]?.get('token')).toBe(text === 'نفّذ' ? 'signed' : null);
  expect(chat().some(element => element.type === KoConfirm)).toBe(false);
});

it('consumes a token only once, including double taps', () => {
  const approval = createApproval('signed', 100);
  expect(approval.take(101)).toBe('signed');
  expect(approval.take(101)).toBeNull();
});

it('cancel clears the token without submitting', () => {
  const approval = createApproval('signed', 100);
  approval.clear();
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
  const render = () => {
    hooks.cursor = 0;
    return elements(KoConfirm({ approval, busy: false, now: () => now, onConfirm() {}, onCancel() {} }));
  };
  const button = render().find(element => element.type === 'button');
  let focused = false;
  (button?.props.ref as { current: { focus(): void } }).current = { focus() { focused = true; } };
  hooks.effects[0]?.();
  expect(focused).toBe(true);
  expect(delay).toBe(600000);
  now = 600100;
  timer?.();
  expect(render().some(element => element.type === 'button')).toBe(false);
  expect(render().some(element => element.type === 'p')).toBe(true);
});

it.each(['ar', 'en'] as const)('renders accessible controls and expiry in %s', locale => {
  const render = (now: number, busy = false) => renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(KoConfirm, { approval: createApproval('signed', 100), now: () => now, busy, onConfirm() {}, onCancel() {} })));
  const html = render(100);
  expect(html).toContain('role="group"');
  expect(html).toContain(locale === 'ar' ? 'نفّذ' : 'Confirm');
  expect(html).toContain('min-h-12');
  expect(html).toContain(locale === 'ar' ? 'dir="rtl"' : 'dir="ltr"');
  expect(render(100, true).match(/disabled=""/g)).toHaveLength(2);
  expect(render(600100)).not.toContain('<button');
  expect(render(600100)).toContain(locale === 'ar' ? 'الطلب ده خلص وقته' : 'This request expired');
});
