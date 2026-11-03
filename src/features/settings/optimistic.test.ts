import { beforeEach, expect, it, vi } from 'vitest';
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
  useCallback: (callback: unknown) => callback,
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
});

import { SettingsScreen } from './components/settings-screen';
import { setLocale } from '@/core/i18n/set-locale';
vi.mock('@/core/i18n/set-locale', () => ({ setLocale: vi.fn() }));
vi.mock('./data/settings', () => ({ loadSettings: vi.fn() }));
vi.mock('./components/profile-form', () => ({ ProfileForm: () => null }));
vi.mock('./components/invite-message-form', () => ({ InviteMessageForm: () => null }));
vi.mock('./components/export-card', () => ({ ExportCard: () => null }));
vi.mock('./components/delete-account-card', () => ({ DeleteAccountCard: () => null }));
function render() { hooks.cursor = 0; return SettingsScreen({}); }
function languageButtons() { return nodes(render()).filter(node => node.type === 'button' && node.props.lang); }
it('selects the language immediately and rolls back with the translated error', async () => {
  const request = deferred<void>(); vi.mocked(setLocale).mockReturnValue(request.promise);
  expect(languageButtons().find(node => node.props.lang === 'en')?.props['aria-pressed']).toBe(true);
  const choose = languageButtons().find(node => node.props.lang === 'ar')?.props.onClick as () => void;
  choose(); choose();
  expect(setLocale).toHaveBeenCalledTimes(1);
  expect(languageButtons().find(node => node.props.lang === 'ar')?.props['aria-pressed']).toBe(true);
  expect(languageButtons().every(node => node.props.disabled)).toBe(true);
  request.reject(new Error('network')); await settle();
  expect(languageButtons().find(node => node.props.lang === 'en')?.props['aria-pressed']).toBe(true);
  expect(nodes(render()).some(node => node.props.role === 'alert' && text(node) === 'languageFailed')).toBe(true);
});
it('keeps a confirmed language selection', async () => {
  const request = deferred<void>(); vi.mocked(setLocale).mockReturnValue(request.promise);
  (languageButtons().find(node => node.props.lang === 'ar')?.props.onClick as () => void)();
  request.resolve(); await settle();
  expect(languageButtons().find(node => node.props.lang === 'ar')?.props['aria-pressed']).toBe(true);
  expect(languageButtons().every(node => !node.props.disabled)).toBe(true);
  expect(nodes(render()).some(node => node.props.role === 'alert')).toBe(false);
});

