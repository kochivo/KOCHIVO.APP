import type * as React from 'react';
import type * as Offline from '@/core/offline';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useWarmupSession as renderWarmupSession } from './hooks/use-warmup-session';
import { sessionId } from './ids';
import * as ids from './ids';

const harness = vi.hoisted(() => ({ draft: null as unknown, stored: undefined as unknown, query: null as null | (() => Promise<unknown>) }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => [harness.draft, (next: unknown) => { harness.draft = next; }],
  useCallback: <T,>(callback: T) => callback,
}));
vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(),
  useLiveQuery: (query: () => Promise<unknown>) => { harness.query = query; return harness.stored; },
}));
vi.mock('server-only', () => ({}));
const warmup = { items: [{ id: 'a', name: 'Walk', amount: 5, unit: 'min' as const }], ramp: false };
const data = new Map<string, string>();
const view = (day = 'day', today = '2026-11-07', active?: string) => renderWarmupSession(day, today, active, warmup);
async function load(day = 'day', today = '2026-11-07', active?: string) {
  view(day, today, active);
  harness.stored = await harness.query?.();
  return view(day, today, active);
}
beforeEach(() => {
  Object.assign(harness, { draft: null, stored: undefined, query: null });
  data.clear();
  vi.stubGlobal('window', { localStorage: { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value) } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('ticks immediately, persists before any logged set, and reloads under the stable session ID', async () => {
  expect(view().loading).toBe(true);
  (await load()).toggle('a');
  expect(view().pending).toBe(false);
  expect(data.has(`warmup:${await sessionId('day', '2026-11-07')}`)).toBe(true);
  harness.draft = null;
  harness.stored = undefined;
  expect((await load()).checked).toEqual(['a']);
  view().toggle('a');
  expect(view().pending).toBe(true);
});
it('persists skip across reload and isolates the next date and another day', async () => {
  (await load()).skip();
  expect(view().pending).toBe(false);
  harness.draft = null;
  harness.stored = undefined;
  expect((await load()).skipped).toBe(true);
  expect((await load('day', '2026-11-08')).pending).toBe(true);
  expect((await load('another-day')).pending).toBe(true);
});
it('keeps yesterday’s checklist for a logged session continuing across midnight', async () => {
  (await load()).toggle('a');
  harness.draft = null;
  harness.stored = undefined;
  const id = await sessionId('day', '2026-11-07');
  const continued = await load('day', '2026-11-08', id);
  expect(continued.pending).toBe(false);
  expect(continued.checked).toEqual(['a']);
});
it('allows skip and optimistic ticking when access to browser storage throws', async () => {
  vi.stubGlobal('window', { get localStorage() { throw new Error('Unavailable'); } });
  (await load()).toggle('a');
  expect(view().pending).toBe(false);
  view().toggle('a');
  expect(view().pending).toBe(true);
  view().skip();
  expect(view().pending).toBe(false);
});
it('exposes a read error instead of leaving the view loading if stable ID generation fails', async () => {
  vi.spyOn(ids, 'sessionId').mockRejectedValue(new Error('crypto unavailable'));
  const state = await load();
  expect(state.loading).toBe(false);
  expect(state.error).toBe(true);
});
it.each(['skip', 'tick'])('preserves optimistic %s through first-set session creation when storage is blocked', async action => {
  vi.stubGlobal('window', { get localStorage() { throw new Error('Unavailable'); } });
  const initial = await load();
  if (action === 'skip') initial.skip(); else initial.toggle('a');
  const id = await sessionId('day', '2026-11-07');
  expect((await load('day', '2026-11-07', id)).pending).toBe(false);
  expect((await load('day', '2026-11-08', id)).pending).toBe(false);
});
