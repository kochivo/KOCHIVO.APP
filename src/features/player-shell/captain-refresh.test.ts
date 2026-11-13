import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readCaptainCache, useMyCaptain, writeCaptainCache } from './hooks/use-my-captain';
import { fetchMyCaptain } from './data/my-captain';

const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void | (() => void))[] }));
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  useState(initial: unknown) {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = initial;
    return [state.slots[index], (next: unknown) => {
      state.slots[index] = typeof next === 'function' ? next(state.slots[index]) : next;
    }];
  },
  useRef(initial: unknown) {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = { current: initial };
    return state.slots[index];
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => state.effects.push(effect),
}));
vi.mock('./data/my-captain', () => ({ fetchMyCaptain: vi.fn() }));
vi.mock('@/core/offline/db', () => ({ localDb: () => ({ userId: 'p' }) }));
const captain = { fullName: 'Coach', phone: null, accessUntil: '2026-11-20', archivedAt: null, startedOn: null, pending: true };
const CaptainHarness = () => useMyCaptain();
const render = () => { state.cursor = 0; return CaptainHarness(); };
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
beforeEach(() => {
  state.slots = []; state.effects = []; state.cursor = 0;
  vi.mocked(fetchMyCaptain).mockReset();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem: vi.fn() },
    addEventListener: vi.fn(), removeEventListener: vi.fn(), setInterval: vi.fn(() => 1), clearInterval: vi.fn() });
  vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });

it('roundtrips the captain id in cache and accepts caches written before chat', () => {
  let saved = '';
  vi.stubGlobal('window', { localStorage: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } } });
  writeCaptainCache({ ...captain, captainId: 'captain-id' });
  expect(readCaptainCache()?.captainId).toBe('captain-id');
  saved = JSON.stringify(captain);
  expect(readCaptainCache()?.fullName).toBe('Coach');
  expect(readCaptainCache()?.captainId).toBeUndefined();
});

it('preserves loaded access state when a background refresh fails', async () => {
  vi.mocked(fetchMyCaptain).mockResolvedValue({ data: captain });
  render();
  const cleanup = state.effects[0]?.();
  await settle();
  expect(render().status).toBe('ready');
  vi.mocked(fetchMyCaptain).mockRejectedValue(new Error('offline'));
  await render().retry();
  expect(render().status).toBe('ready');
  expect(render().data).toEqual(captain);
  expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 30_000);
  cleanup?.();
  expect(window.clearInterval).toHaveBeenCalledWith(1);
});
it('reports an initial load failure and can recover on retry', async () => {
  vi.mocked(fetchMyCaptain).mockResolvedValue({ error: 'unavailable' });
  render();
  const cleanup = state.effects[0]?.();
  await settle();
  expect(render().status).toBe('error');
  vi.mocked(fetchMyCaptain).mockResolvedValue({ data: captain });
  await render().retry();
  expect(render().status).toBe('ready');
  cleanup?.();
});
