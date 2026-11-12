import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type * as React from 'react';
import type * as Offline from '@/core/offline';
import { KochivoDB } from '@/core/offline/db';
import type { ProgramSnapshot, SnapshotDay } from '@/core/offline/db';
import { startSession, logSet } from './data/log-set';
import type { useFocusSession } from './hooks/use-focus-session';

const now = Date.parse('2026-11-04T10:00:00Z');
const today = '2026-11-04';
const day: SnapshotDay = { id: 'day', title: 'Day', position: 1, exercises: [{
  id: 'item', exercise_id: 'exercise', position: 1, sets: 3, reps_min: 8, reps_max: 12,
  rest_seconds: 0, superset_group: null, rpe: null, tempo: null, notes: null,
  name_ar: null, name_en: 'Squat', media_path: null,
}] };
let snapshot: ProgramSnapshot;
let db: KochivoDB;
type Slot = { value?: unknown; deps?: readonly unknown[]; cleanup?: () => void };
let slots: Slot[];
let cursor: number;
let effects: (() => void)[];
let renderSession: typeof useFocusSession;
const translate = (key: string) => key;

function nextSlot() {
  const index = cursor++;
  return slots[index] ?? (slots[index] = {});
}

function changed(slot: Slot, deps: readonly unknown[]) {
  return !slot.deps || deps.length !== slot.deps.length || deps.some((value, index) => !Object.is(value, slot.deps?.[index]));
}

function memo<T>(factory: () => T, deps: readonly unknown[]) {
  const slot = nextSlot();
  if (changed(slot, deps)) { slot.value = factory(); slot.deps = deps; }
  return slot.value as T;
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ now, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  slots = []; cursor = 0; effects = [];
  snapshot = { id: 'active', player_id: 'player', program_id: 'program', title: 'Program',
    notes: null, settings: {}, training_days: [], days: [day] };
  db = new KochivoDB('focus-live-query-dependencies');
  await db.open();
  const session = await startSession(db, day, today, now);
  await logSet(db, { session_id: session.id, program_exercise_id: 'item', exercise_id: 'exercise',
    set_index: 1, weight_kg: 60, reps: 8 }, now);
  vi.doMock('react', async original => ({ ...await original<typeof React>(),
    useState: (initial: unknown) => {
      const slot = nextSlot();
      if (!('value' in slot)) slot.value = initial;
      return [slot.value, (next: unknown) => {
        slot.value = typeof next === 'function' ? next(slot.value) : next;
      }];
    },
    useRef: (current: unknown) => memo(() => ({ current }), []),
    useMemo: memo,
    useCallback: <T,>(callback: T, deps: readonly unknown[]) => memo(() => callback, deps),
    useEffect: (effect: () => void | (() => void), deps: readonly unknown[]) => {
      const slot = nextSlot();
      if (changed(slot, deps)) effects.push(() => {
        slot.cleanup?.();
        slot.cleanup = effect() || undefined;
        slot.deps = deps;
      });
    },
  }));
  // Keep the real useLiveQuery and Dexie subscriptions; isolate unrelated feature hooks.
  vi.doMock('@/core/offline', async original => ({ ...await original<typeof Offline>(), localDb: () => db }));
  vi.doMock('@/core/i18n/client', () => ({ useT: () => translate }));
  vi.doMock('@/features/player-home', () => ({
    useProgramSnapshot: () => ({ snapshot, status: 'ready', retry() {} }),
  }));
  vi.doMock('@/features/readiness', () => ({ useTodayDecision: () => null, reducedSets: (sets: number) => sets }));
  vi.doMock('./hooks/use-rest-timer', () => ({ useRestTimer: () => ({ remaining: 0, start() {}, skip() {} }) }));
  vi.doMock('./hooks/use-bodyweight', () => ({ useBodyweight: () => ({ bodyweight: false, setBodyweight() {} }) }));
  vi.doMock('./hooks/use-last-session', () => ({ useLastSession: () => ({ last: null, ready: true }) }));
  ({ useFocusSession: renderSession } = await import('./hooks/use-focus-session'));
});

afterEach(async () => {
  for (const slot of slots) slot.cleanup?.();
  await db.delete();
  vi.useRealTimers();
  for (const path of ['react', '@/core/offline', '@/core/i18n/client', '@/features/player-home',
    '@/features/readiness', './hooks/use-rest-timer', './hooks/use-bodyweight', './hooks/use-last-session']) vi.doUnmock(path);
});

function render() {
  cursor = 0;
  const state = renderSession(day.id, today, 'player');
  for (const effect of effects.splice(0)) effect();
  return state;
}

async function loaded() {
  for (let pass = 0; pass < 4; pass++) { render(); await vi.runAllTimersAsync(); }
  const state = render();
  expect(state.loading).toBe(false);
  expect(state.doneSets).toHaveLength(1);
  expect(state.current?.setIndex).toBe(2);
  return state;
}

it('keeps the dependent sets value when a session query emits an equal but new object', async () => {
  const before = await loaded();
  if (!before.session) throw new Error('Missing session fixture');
  // Re-saving an unchanged row still makes Dexie emit a newly cloned object.
  await db.workout_sessions.put({ ...before.session });
  for (let pass = 0; pass < 4; pass++) await vi.runAllTimersAsync();
  const after = render();
  expect(after.session).toEqual(before.session);
  expect(after.session).not.toBe(before.session);
  expect(after.doneSets).toHaveLength(1);
  expect(after.current?.setIndex).toBe(2);
  expect(after.loading).toBe(false);
});

it('keeps session and sets values when a snapshot emits an equal but new day object', async () => {
  const before = await loaded();
  snapshot = structuredClone(snapshot);
  const after = render();
  expect(after.day).toEqual(before.day);
  expect(after.day).not.toBe(before.day);
  expect(after.session).toBe(before.session);
  expect(after.doneSets).toHaveLength(1);
  expect(after.current?.setIndex).toBe(2);
  expect(after.loading).toBe(false);
});
