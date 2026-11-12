import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type * as React from 'react';
import type * as Offline from '@/core/offline';
import { KochivoDB } from '@/core/offline/db';
import type { SnapshotDay } from '@/core/offline';
import { createT } from '@/core/i18n/messages';
import { sessionId } from './ids';
import { logSet, startSession } from './data/log-set';

const now = Date.parse('2026-11-12T10:00:00Z');
const day: SnapshotDay = { id: 'day', title: 'Push', position: 1, exercises: [{
  id: 'row', exercise_id: 'bench', position: 1, sets: 2, reps_min: 8, reps_max: 12, rir: 2,
  rest_seconds: 0, superset_group: null, rpe: null, tempo: null, notes: null, name_ar: null, name_en: 'Bench', media_path: null,
  alternatives: ['press'], alternative_exercises: [{ id: 'press', name_ar: null, name_en: 'Press', media_path: null }],
  set_plan: [{ reps_min: 12, reps_max: 12, rir: 2 }, { reps_min: 6, reps_max: 8, rir: 1 }],
}] };
let db: KochivoDB, slots: unknown[], slot: number, queries: (() => unknown)[], values: unknown[];
let storage: Map<string, string>;
vi.mock('server-only', () => ({}));
vi.mock('next/image', () => ({ default: () => null }));
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers({ now, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  db = new KochivoDB('alternative-session'); slots = []; slot = 0; queries = []; values = []; storage = new Map();
  vi.stubGlobal('window', { localStorage: { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value) } });
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
  vi.doMock('./hooks/use-rest-timer', () => ({ useRestTimer: () => ({ remaining: 0, start() {}, skip() {} }) }));
  await db.open();
});
afterEach(async () => {
  vi.clearAllTimers(); vi.useRealTimers(); await db.delete(); vi.unstubAllGlobals();
  for (const path of ['react', '@/core/i18n/client', '@/core/offline', '@/features/player-home', '@/features/readiness', './hooks/use-rest-timer']) vi.doUnmock(path);
});
async function render(today = '2026-11-12') {
  const { useFocusSession: renderSession } = await import('./hooks/use-focus-session');
  for (let pass = 0; pass < 5; pass++) {
    slot = 0; queries = []; renderSession(day.id, today);
    values = await Promise.all(queries.map(query => query()));
  }
  slot = 0; queries = []; return renderSession(day.id, today);
}
it('switches, survives reload before the first set, logs the choice and restores original next session', async () => {
  let state = await render();
  expect(state.reps).toBe(12);
  state.switchExercise('press');
  state = await render();
  expect(state.current?.exercise.exercise_id).toBe('press');
  expect(await db.workout_sessions.count()).toBe(0);
  expect(storage.get(`exercise-choices:${await sessionId(day.id, '2026-11-12')}`)).toContain('press');
  slots = []; values = [];
  state = await render();
  expect(state.current?.exercise.exercise_id).toBe('press');
  state.setBodyweight(true); state = await render(); await state.complete();
  expect((await db.set_logs.toArray())[0]).toMatchObject({ exercise_id: 'press', program_exercise_id: 'row', set_index: 1, reps: 12 });
  expect((await db.outbox.toArray()).map(row => row.table).sort()).toEqual(['set_logs', 'workout_sessions']);
  state = await render();
  expect(state.current?.setIndex).toBe(2); expect(state.reps).toBe(6);
  slots = []; values = [];
  state = await render('2026-11-19');
  expect(state.current?.exercise.exercise_id).toBe('bench');
});
it('looks up the chosen exercise history and preserves logged identity when editing after switching back', async () => {
  await logSet(db, { session_id: 'older', program_exercise_id: 'another', exercise_id: 'press', set_index: 1, weight_kg: 45, reps: 10 }, now - 1000);
  let state = await render(); state.switchExercise('press'); state = await render();
  expect(state.performance).toEqual({ weight_kg: 45, reps: 10 });
  await state.complete();
  const row = (await db.set_logs.toArray()).find(row => row.program_exercise_id === 'row');
  if (!row) throw new Error('Missing logged alternative');
  state = await render(); state.switchExercise(''); state = await render();
  state.edit(row); state = await render();
  expect(state.current?.exercise.exercise_id).toBe('press');
  state.setWeight(50); state = await render(); await state.complete();
  expect(await db.set_logs.get(row.id)).toMatchObject({ exercise_id: 'press', weight_kg: 50 });
});

it('preserves the logged exercise when the captain removes its alternative before a reload and edit', async () => {
  const session = await startSession(db, day, '2026-11-12', now);
  await logSet(db, { session_id: session.id, program_exercise_id: 'row', exercise_id: 'press',
    set_index: 1, weight_kg: 45, reps: 10 }, now);
  const row = (await db.set_logs.toArray())[0];
  const exercise = day.exercises[0];
  if (!row || !exercise) throw new Error('Missing fixture');
  const alternatives = exercise.alternatives, metadata = exercise.alternative_exercises;
  try {
    exercise.alternatives = []; exercise.alternative_exercises = [];
    let state = await render(); state.edit(row); state = await render();
    expect(state.current?.exercise.exercise_id).toBe('press');
    state.setWeight(50); state = await render(); await state.complete();
    expect(await db.set_logs.get(row.id)).toMatchObject({ exercise_id: 'press', weight_kg: 50 });
  } finally { exercise.alternatives = alternatives; exercise.alternative_exercises = metadata; }
});
