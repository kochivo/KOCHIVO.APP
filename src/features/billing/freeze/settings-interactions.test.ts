import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as ReactModule from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createResourceStore } from '@/core/resource/store';
import { NumberInput } from '@/ui';
import { Button } from '@/ui/button';
import { FreezeSettings } from './freeze-settings';
import { saveFreezeSettings } from '../data/freeze-settings';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, success: vi.fn() }));
const store = createResourceStore({ now: () => 0 });
const key = 'billing:freeze-settings';
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = next; }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useCallback: (callback: unknown) => callback,
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: hooks.success }) }));
vi.mock('../data/freeze-settings', () => ({ loadFreezeSettings: vi.fn(), saveFreezeSettings: vi.fn() }));
vi.mock('@/core/resource', () => ({ useResource: () => ({
  ...store.read(key), retry: vi.fn(),
  mutate: (next: (current: unknown) => unknown, commit: () => Promise<unknown>) => store.mutate(key, next, commit),
}) }));
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render() { hooks.cursor = 0; return nodes(FreezeSettings()); }
function field() {
  const node = render().find(node => node.type === NumberInput);
  if (!node) throw new Error('Missing freeze days input');
  return node.props as { value: number | null; disabled: boolean; onCommit: (days: number | null) => void };
}
function pending() {
  let resolve: (value: { error: boolean }) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<{ error: boolean }>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
async function settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
beforeEach(async () => {
  vi.clearAllMocks(); hooks.slots = []; store.clear();
  await store.retry(key, async () => ({ default_days: 7 }));
});
it('shows cleared days immediately, locks duplicate saves and confirms success', async () => {
  const request = pending(); vi.mocked(saveFreezeSettings).mockReturnValue(request.promise);
  const commit = field().onCommit;
  commit(null); commit(9);
  expect(field().value).toBe(null);
  expect(field().disabled).toBe(true);
  expect(saveFreezeSettings).toHaveBeenCalledExactlyOnceWith(null);
  request.resolve({ error: false }); await settle();
  expect(field().value).toBe(null);
  expect(field().disabled).toBe(false);
  expect(hooks.success).toHaveBeenCalledWith({ title: 'settingsSaved', detail: 'defaultDays', icon: 'check' });
});
it.each(['result', 'throw'])('rolls back a %s failure and retries the attempted value', async mode => {
  const request = pending(); vi.mocked(saveFreezeSettings).mockReturnValueOnce(request.promise);
  field().onCommit(12);
  expect(field().value).toBe(12);
  if (mode === 'result') request.resolve({ error: true }); else request.reject(new Error('Offline'));
  await settle();
  expect(field().value).toBe(7);
  expect(render().some(node => node.props.role === 'alert' && node.props.children === 'settingsSaveError')).toBe(true);
  const retry = render().find(node => node.type === Button && node.props.children === 'retry');
  if (!retry) throw new Error('Missing retry button');
  vi.mocked(saveFreezeSettings).mockResolvedValueOnce({ error: false });
  (retry.props.onClick as () => void)(); await settle();
  expect(saveFreezeSettings).toHaveBeenLastCalledWith(12);
  expect(field().value).toBe(12);
  expect(field().disabled).toBe(false);
});
