import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ApprovalWatcher } from './components/approval-watcher';

const state = vi.hoisted(() => ({ effect: undefined as (() => () => void) | undefined,
  replace: vi.fn(), rpc: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useEffect: (effect: () => () => void) => { state.effect = effect; } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ rpc: state.rpc }) }));
let focus: EventTarget;
let visibility: EventTarget;
let cleanup: (() => void) | undefined;
beforeEach(() => {
  state.replace.mockReset(); state.rpc.mockReset();
  focus = new EventTarget(); visibility = new EventTarget();
  Object.defineProperty(visibility, 'visibilityState', { value: 'visible' });
  vi.stubGlobal('window', focus); vi.stubGlobal('document', visibility);
  vi.stubGlobal('setInterval', vi.fn(() => 1)); vi.stubGlobal('clearInterval', vi.fn());
  ApprovalWatcher(); cleanup = state.effect?.();
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
  state.rpc.mockResolvedValue({ data: [{ captain_status: 'approved' }], error: null });
  visibility.dispatchEvent(new Event('visibilitychange')); await settle();
  expect(state.replace).toHaveBeenCalledWith('/captain');
  cleanup?.(); cleanup = undefined;
  state.replace.mockClear();
  focus.dispatchEvent(new Event('focus')); await settle();
  expect(state.replace).not.toHaveBeenCalled();
});
