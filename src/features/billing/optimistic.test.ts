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
});

import { PlayerBillingRow } from './components/player-billing-row';
import { RenewSheet } from './components/renew-sheet';
import { CollectSheet } from './components/collect-sheet';
import { renewPlayer } from './data/billing';
import { collectPayment } from './data/finance-actions';
import type { BillingPlayer } from './types';
import type { Renewal } from './components/renew-sheet';
vi.mock('./data/billing', () => ({ renewPlayer: vi.fn() }));
vi.mock('./data/finance-actions', () => ({ collectPayment: vi.fn() }));
const player: BillingPlayer = {
  playerId: 'p', fullName: 'Ali', accessUntil: '2026-11-03', startedOn: '2026-10-01',
  lastTrainingDate: null, programTitle: null, openTasks: 0, status: 'ending', phone: null,
  lastPayment: null, due: 200,
};
const packages = [{ id: 'package', name: 'Month', days: 30, price_egp: 500 }];
function render() { hooks.cursor = 0; return PlayerBillingRow({ player, today: '2026-11-03', packages }); }
function click(label: string) {
  const button = nodes(render()).find(node => text(node.props.children) === label && typeof node.props.onClick === 'function');
  expect(button).toBeDefined(); (button?.props.onClick as () => void)();
}
it.each(['renew', 'collect'].flatMap(action => ['error', 'throw'].map(mode => ({ action, mode }))))('rolls back $action on $mode and blocks duplicate submits', async ({ action, mode }) => {
  const request = deferred<{ error: string }>();
  if (action === 'renew') vi.mocked(renewPlayer).mockReturnValue(request.promise);
  else vi.mocked(collectPayment).mockReturnValue(request.promise);
  click(action);
  const sheet = nodes(render()).find(node => node.type === (action === 'renew' ? RenewSheet : CollectSheet));
  const submit = sheet?.props.onSave as (value: Renewal | number) => void;
  const input = action === 'renew' ? { days: null, amount: 100, packageId: 'package' } : 100;
  submit(input); submit(input);
  expect(action === 'renew' ? renewPlayer : collectPayment).toHaveBeenCalledTimes(1);
  expect(nodes(render()).some(node => node.type === 'time' && node.props.dateTime === (action === 'renew' ? '2026-12-03' : '2026-11-03'))).toBe(true);
  expect(text(render())).toContain(action === 'renew' ? 'owes{"amount":"600"}' : 'owes{"amount":"100"}');
  if (mode === 'error') request.resolve({ error: 'denied' }); else request.reject(new Error('network'));
  await settle();
  expect(nodes(render()).find(node => node.props.role === 'alert')?.props.children).toBe(mode === 'error' ? 'denied' : action === 'renew' ? 'renewFailed' : 'collectFailed');
  expect(nodes(render()).some(node => node.type === 'time' && node.props.dateTime === '2026-11-03')).toBe(true);
  expect(text(render())).toContain('noPayments');
  expect(text(render())).toContain('owes{"amount":"200"}');
});
it('reconciles the renewal date returned by the server', async () => {
  const request = deferred<{ data: string }>(); vi.mocked(renewPlayer).mockReturnValue(request.promise);
  click('renew');
  const sheet = nodes(render()).find(node => node.type === RenewSheet);
  (sheet?.props.onSave as (value: Renewal) => void)({ days: 30, amount: null });
  request.resolve({ data: '2026-12-05' }); await settle();
  expect(nodes(render()).some(node => node.type === 'time' && node.props.dateTime === '2026-12-05')).toBe(true);
});

it('reconciles collection dues returned by the server', async () => {
  const request = deferred<{ data: number }>(); vi.mocked(collectPayment).mockReturnValue(request.promise);
  click('collect');
  const sheet = nodes(render()).find(node => node.type === CollectSheet);
  (sheet?.props.onSave as (value: number) => void)(100);
  expect(text(render())).toContain('owes{"amount":"100"}');
  request.resolve({ data: 75 }); await settle();
  expect(text(render())).toContain('owes{"amount":"75"}');
});

