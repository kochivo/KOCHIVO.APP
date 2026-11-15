import type * as React from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { StartGateBoundary } from './components/start-gate-boundary';
import { StartGateScreen } from './components/start-gate-screen';
import { loadStartGate } from './data/start-gate';

const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void | (() => void))[] }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => {
    const slot = state.cursor++;
    if (!(slot in state.slots)) state.slots[slot] = initial;
    return [state.slots[slot], (value: unknown) => { state.slots[slot] = typeof value === 'function' ? value(state.slots[slot]) : value; }];
  },
  useEffect: (effect: () => void | (() => void)) => state.effects.push(effect),
}));
vi.mock('./data/start-gate', () => ({ loadStartGate: vi.fn() }));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key }));
const pending = { name: 'Ali', rows: [{ id: 'request', title: 'Goals', blocks_access: true, answered_at: null }] };
function render() { state.cursor = 0; return StartGateBoundary({ captain: 'Coach', children: 'APP' }); }
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
beforeEach(() => {
  state.slots = []; state.effects = []; state.cursor = 0;
  vi.mocked(loadStartGate).mockReset();
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });

it('withholds app content through loading and pending forms, then unlocks on focus after completion', async () => {
  vi.mocked(loadStartGate).mockResolvedValue(pending);
  expect(render()).not.toBe('APP');
  const cleanup = state.effects[0]?.();
  await settle();
  expect((render() as ReactElement).type).toBe(StartGateScreen);
  vi.mocked(loadStartGate).mockResolvedValue({ ...pending, rows: pending.rows.map(row => ({ ...row, answered_at: '2026-11-03' })) });
  const focus = vi.mocked(window.addEventListener).mock.calls.find(([event]) => event === 'focus')?.[1];
  if (typeof focus !== 'function') throw new Error('Missing focus listener');
  focus(new Event('focus'));
  await settle();
  expect(render()).toBe('APP');
  cleanup?.();
  expect(window.removeEventListener).toHaveBeenCalledWith('focus', focus);
});
it('fails closed on load error instead of mounting app content', async () => {
  vi.mocked(loadStartGate).mockRejectedValue(new Error('offline'));
  render(); const cleanup = state.effects[0]?.(); await settle();
  const result = render() as ReactElement<{ message: string }>;
  expect(result.props.message).toBe('error');
  expect(result).not.toBe('APP');
  cleanup?.();
});
