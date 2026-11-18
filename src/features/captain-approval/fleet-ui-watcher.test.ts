import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApprovalWatcher } from './components/approval-watcher';

const state = vi.hoisted(() => ({ effect: undefined as (() => () => void) | undefined,
  replace: vi.fn(), rpc: vi.fn(), values: [] as unknown[], cursor: 0, busy: { current: false } }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useRef: () => state.busy,
  useCallback: (callback: unknown) => callback,
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index], (value: unknown) => { state.values[index] = value; }];
  },
  useEffect: (effect: () => () => void) => { state.effect = effect; } }));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ rpc: state.rpc }) }));
let focus: EventTarget;
let visibility: EventTarget;
let cleanup: (() => void) | undefined;
beforeEach(async () => {
  state.replace.mockReset(); state.rpc.mockReset();
  state.rpc.mockResolvedValue({ data: [{ captain_status: 'pending' }], error: null });
  state.values = []; state.cursor = 0; state.busy.current = false;
  focus = new EventTarget(); visibility = new EventTarget();
  Object.defineProperty(visibility, 'visibilityState', { value: 'visible' });
  vi.stubGlobal('window', focus); vi.stubGlobal('document', visibility);
  vi.stubGlobal('setInterval', vi.fn(() => 1)); vi.stubGlobal('clearInterval', vi.fn());
  ApprovalWatcher(); cleanup = state.effect?.(); await settle();
});
afterEach(() => { cleanup?.(); vi.unstubAllGlobals(); });
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
it.each(['pending', 'rejected', 'approved'])('handles %s when the captain returns to the tab', async status => {
  state.rpc.mockResolvedValue({ data: [{ captain_status: status }], error: null });
  focus.dispatchEvent(new Event('focus'));
  await settle();
  if (status === 'approved') expect(state.replace).toHaveBeenCalledExactlyOnceWith('/captain');
  else expect(state.replace).not.toHaveBeenCalled();
});
it('keeps the captain on the pending screen offline and recovers on visibility change', async () => {
  state.rpc.mockRejectedValueOnce(new Error('offline'));
  focus.dispatchEvent(new Event('focus')); await settle();
  expect(state.replace).not.toHaveBeenCalled();
  state.cursor = 0;
  expect(ApprovalWatcher()).not.toBeNull();
  state.rpc.mockResolvedValue({ data: [{ captain_status: 'approved' }], error: null });
  visibility.dispatchEvent(new Event('visibilitychange')); await settle();
  expect(state.replace).toHaveBeenCalledWith('/captain');
  cleanup?.(); cleanup = undefined;
  state.replace.mockClear();
  focus.dispatchEvent(new Event('focus')); await settle();
  expect(state.replace).not.toHaveBeenCalled();
});

it('lets the captain retry a failed approval check manually', async () => {
  state.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
  focus.dispatchEvent(new Event('focus'));
  await settle();
  state.cursor = 0;
  const failed = ApprovalWatcher();
  if (!failed) throw new Error('Missing approval error');
  state.rpc.mockResolvedValue({ data: [{ captain_status: 'pending' }], error: null });
  failed.props.children[1].props.onClick();
  await settle();
  state.cursor = 0;
  expect(ApprovalWatcher()).toBeNull();
  expect(state.replace).not.toHaveBeenCalled();
});
