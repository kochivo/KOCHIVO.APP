import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import type * as Offline from '@/core/offline';
import { KochivoDB } from '@/core/offline/db';
import type { SnapshotDay } from '@/core/offline';
import { createT } from '@/core/i18n/messages';

const now = Date.parse('2026-11-12T10:00:00Z');
const day: SnapshotDay = { id: 'day', title: 'Push', position: 1, exercises: [1, 2].map(n => ({
  id: `row${n}`, exercise_id: `exercise${n}`, position: n, sets: 2, reps_min: 8, reps_max: 12, rir: 2,
  rest_seconds: 90, superset_group: 1, rpe: null, tempo: null, notes: null, name_ar: null, name_en: `Exercise ${n}`, media_path: null,
  set_plan: [{ reps_min: 8, reps_max: 12, rir: 2, drop: { count: 2, percent: 20, mode: 'failure', reps: null } }],
})) };
let db: KochivoDB, slots: unknown[], slot: number, queries: (() => unknown)[], values: unknown[];
const rest = vi.hoisted(() => ({ remaining: 0, start: vi.fn(), skip: vi.fn() }));
vi.mock('server-only', () => ({}));
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers({ now, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  db = new KochivoDB('drop-session'); slots = []; slot = 0; queries = []; values = []; rest.start.mockClear();
  vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem() {} } });
  vi.doMock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en'), useLocale: () => 'en' }));
  vi.doMock('react', async original => ({ ...await original<typeof React>(),
    useState: (initial: unknown) => {
      const index = slot++; if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: unknown) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef: (current: unknown) => ({ current }), useCallback: <T,>(callback: T) => callback,
    useMemo: <T,>(callback: () => T) => callback(), useEffect: () => undefined,
  }));
  vi.doMock('@/core/offline', async original => ({ ...await original<typeof Offline>(), localDb: () => db,
    useLiveQuery: (query: () => unknown) => { queries.push(query); return values[queries.length - 1]; },
  }));
  vi.doMock('@/features/player-home', () => ({ useProgramSnapshot: () => ({ snapshot: { days: [day] }, status: 'ready', retry() {} }) }));
  vi.doMock('@/features/readiness', () => ({ useTodayDecision: () => null, reducedSets: (sets: number) => sets }));
  vi.doMock('./hooks/use-rest-timer', () => ({ useRestTimer: () => rest }));
  await db.open();
});
afterEach(async () => {
  vi.clearAllTimers(); vi.useRealTimers(); await db.delete(); vi.unstubAllGlobals();
  for (const path of ['react', '@/core/i18n/client', '@/core/offline', '@/features/player-home', '@/features/readiness', './hooks/use-rest-timer']) vi.doUnmock(path);
});
async function render() {
  const { useFocusSession: renderSession } = await import('./hooks/use-focus-session');
  for (let pass = 0; pass < 5; pass++) {
    slot = 0; queries = []; renderSession(day.id, '2026-11-12');
    values = await Promise.all(queries.map(query => query()));
  }
  slot = 0; queries = []; return renderSession(day.id, '2026-11-12');
}
it('resumes drops, uses adjusted weights, queues every row and rests only after the last member drops', async () => {
  let state = await render();
  state.setWeight(60); state = await render(); await state.complete();
  state = await render();
  expect(state.current).toMatchObject({ setIndex: 1, dropIndex: 1, restAfter: 0 });
  expect(state.weight).toBe(47.5);
  slots = []; values = []; state = await render();
  expect(state.current?.dropIndex).toBe(1);
  state.setWeight(50); state = await render(); state.setReps(7); state = await render(); await state.complete();
  state = await render(); expect(state.weight).toBe(40);
  state.setReps(5); state = await render(); await state.complete();
  state = await render(); expect(state.current?.exercise.id).toBe('row2');
  expect(rest.start.mock.calls.every(([seconds]) => seconds === 0)).toBe(true);
  state.setWeight(60); state = await render(); await state.complete();
  for (const reps of [7, 5]) { state = await render(); state.setReps(reps); state = await render(); await state.complete(); }
  expect(rest.start).toHaveBeenLastCalledWith(90);
  expect((await db.set_logs.toArray()).map(row => row.drop_index).sort()).toEqual([0, 0, 1, 1, 2, 2]);
  expect(await db.outbox.count()).toBe(7);
});
