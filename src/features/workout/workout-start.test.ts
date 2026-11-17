import { createT } from '@/core/i18n/messages';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { KochivoDB, type SnapshotDay } from '@/core/offline';
import type * as Offline from '@/core/offline';
import type * as React from 'react';
import { localDate } from '@/lib/dates';
import { startSession, logSet, finishSession } from './data/log-set';
import { trainingDate } from './training-date';

const beforeMidnight = Date.parse('2026-11-03T21:59:00Z');
const afterMidnight = Date.parse('2026-11-03T22:01:00Z');
const day: SnapshotDay = { id: 'day', title: 'صدر', position: 1, exercises: [{
  id: 'a', exercise_id: 'a', position: 1, sets: 2, reps_min: 8, reps_max: 12,
  rest_seconds: 0, superset_group: null, rpe: null, tempo: null, notes: null,
  name_ar: null, name_en: 'a', media_path: null,
}] };
const db = new KochivoDB('workout-start-test');
let queries: (() => unknown)[];
let values: unknown[];

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ now: afterMidnight, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  queries = [];
  values = [];
  vi.doMock('@/core/timezone/client', () => ({ useTimezone: () => 'Africa/Cairo' }));
  vi.doMock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar'), useLocale: () => 'ar' }));
  vi.doMock('react', async original => ({
    ...await original<typeof React>(),
    useState: (initial: unknown) => [initial, () => undefined],
    useRef: (current: unknown) => ({ current }),
    useCallback: <T,>(callback: T) => callback,
    useMemo: <T,>(callback: () => T) => callback(),
    useEffect: () => undefined,
  }));
  vi.doMock('@/core/offline', async (original) => ({
    ...await original<typeof Offline>(), localDb: () => db,
    useLiveQuery: (query: () => unknown) => {
      queries.push(query);
      return values[queries.length - 1];
    },
  }));
  vi.doMock('@/features/player-home', () => ({
    useCycle: () => ({}), isLightDay: () => false,
    useProgramSnapshot: () => ({ snapshot: { days: [day] }, status: 'ready', retry: async () => undefined }),
  }));
  vi.doMock('./hooks/use-rest-timer', () => ({
    useRestTimer: () => ({ remaining: 0, start: () => undefined }),
  }));
  // These tests isolate session/date behavior; bodyweight is a valid first set without history.
  vi.doMock('./hooks/use-bodyweight', () => ({ useBodyweight: () => ({ bodyweight: true, setBodyweight() {} }) }));
  await db.open();
});

afterEach(async () => {
  vi.clearAllTimers();
  vi.useRealTimers();
  await db.delete();
  vi.doUnmock('react');
  vi.doUnmock('@/core/timezone/client');
  vi.doUnmock('@/core/i18n/client');
  vi.doUnmock('@/core/offline');
  vi.doUnmock('@/features/player-home');
  vi.doUnmock('./hooks/use-rest-timer');
  vi.doUnmock('./hooks/use-bodyweight');
  vi.doUnmock('./hooks/use-last-session');
  vi.doUnmock('./hooks/use-focus-session');
  vi.doUnmock('./hooks/use-warmup-session');
  vi.doUnmock('./hooks/use-wake-lock');
  vi.doUnmock('next/navigation');
  vi.unstubAllGlobals();
});

async function loadedState(today = localDate(new Date(afterMidnight))) {
  const { useFocusSession: renderSession } = await import('./hooks/use-focus-session');
  // Resolve the real local queries through session, sets, then history dependencies.
  for (let pass = 0; pass < 3; pass++) {
    queries = [];
    renderSession(day.id, today, 'player');
    values = await Promise.all(queries.map((query) => query()));
  }
  queries = [];
  return renderSession(day.id, today, 'player');
}

it('suggests 85% of the historical load on a light day without editing the program', async () => {
  vi.doMock('@/features/player-home', () => ({
    useCycle: () => ({ data: { female: true, settings: { enabled: true, light_days: 2 }, starts: ['2026-11-04'], overrides: [] } }),
    isLightDay: () => true,
    useProgramSnapshot: () => ({ snapshot: { days: [day] }, status: 'ready', retry() {} }),
  }));
  vi.doMock('./hooks/use-bodyweight', () => ({ useBodyweight: () => ({ bodyweight: false, setBodyweight() {} }) }));
  vi.doMock('./hooks/use-last-session', () => ({ useLastSession: () => ({ ready: true, last: { sets: [{ set_index: 1, weight_kg: 100, reps: 8 }] } }) }));
  const original = structuredClone(day);
  const state = await loadedState();
  expect(state.weight).toBe(85);
  expect(state.day).toEqual(original);
  expect(day).toEqual(original);
  expect(await db.outbox.count()).toBe(0);
  await state.complete();
  expect((await loadedState()).weight).toBe(85);
});

it('enables a new workout and queues its first session and set at the injected Cairo date', async () => {
  const state = await loadedState();
  expect(state.loading).toBe(false);
  expect(state.disabled).toBe(false);
  expect(state.current?.setIndex).toBe(1);
  expect(await db.workout_sessions.count()).toBe(0);
  expect(await db.outbox.count()).toBe(0);
  await state.complete();
  const sessions = await db.workout_sessions.toArray();
  const sets = await db.set_logs.toArray();
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toMatchObject({ training_date: '2026-11-04', started_at: '2026-11-03T22:01:00.000Z',
    client_updated_at: '2026-11-03T22:01:00.000Z' });
  expect(sets).toHaveLength(1);
  expect(sets[0]).toMatchObject({ session_id: sessions[0]?.id, set_index: 1, reps: 8,
    completed_at: '2026-11-03T22:01:00.000Z', client_updated_at: '2026-11-03T22:01:00.000Z' });
  expect(await db.outbox.count()).toBe(2);
  expect(await db.outbox.toArray()).toEqual(expect.arrayContaining([
    expect.objectContaining({ table: 'workout_sessions', row_id: sessions[0]?.id, enqueued_at: afterMidnight }),
    expect.objectContaining({ table: 'set_logs', row_id: sets[0]?.id, enqueued_at: afterMidnight }),
  ]));
});

it('uses the new date when yesterday has a session with no logged sets', async () => {
  await startSession(db, day, '2026-11-03', beforeMidnight);
  await (await loadedState()).complete();
  expect((await db.workout_sessions.toArray()).map((row) => row.training_date).sort())
    .toEqual(['2026-11-03', '2026-11-04']);
});

it('finishes a cardio-only day explicitly, including repeat taps and reload', async () => {
  const cardioDay = { ...day, exercises: [], cardio: [{ id: 'walk', day_id: day.id, position: 1,
    kind: 'Walk', minutes: 20, intensity: 'low', notes: '' }] };
  vi.doMock('@/features/player-home', () => ({ useCycle: () => ({}), isLightDay: () => false,
    useProgramSnapshot: () => ({ snapshot: { days: [cardioDay] }, status: 'ready', retry() {} }) }));
  const state = await loadedState();
  expect(state.disabled).toBe(false);
  expect(state.queue).toEqual([]);
  expect(state.finished).toBe(false);
  expect(await db.workout_sessions.count()).toBe(0);
  await Promise.all([state.finishCardio(), state.finishCardio()]);
  const started = await loadedState();
  expect(started.finished).toBe(false);
  vi.setSystemTime(afterMidnight + 20 * 60_000);
  await started.finishCardio();
  expect((await loadedState()).finished).toBe(true);
  expect(await db.workout_sessions.count()).toBe(1);
  expect(await db.set_logs.count()).toBe(0);
  expect(await db.outbox.count()).toBe(1);
});

it('does not pin yesterday to a deleted set', async () => {
  const session = await startSession(db, day, '2026-11-03', beforeMidnight);
  await logSet(db, { session_id: session.id, program_exercise_id: 'a', exercise_id: 'a',
    set_index: 1, weight_kg: 60, reps: 8 }, beforeMidnight);
  await db.set_logs.toCollection().modify({ deleted_at: '2026-11-03T22:00:00Z' });
  const state = await loadedState();
  expect(state.doneSets).toEqual([]);
  await state.complete();
  expect(await db.workout_sessions.where('training_date').equals('2026-11-04').count()).toBe(1);
});

it('continues yesterday’s logged session after midnight until completion', async () => {
  const session = await startSession(db, day, '2026-11-03', beforeMidnight);
  await logSet(db, { session_id: session.id, program_exercise_id: 'a', exercise_id: 'a',
    set_index: 1, weight_kg: 60, reps: 8 }, beforeMidnight);
  const state = await loadedState();
  expect(state.current?.setIndex).toBe(2);
  await state.complete();
  expect(await db.workout_sessions.count()).toBe(1);
  expect(await db.set_logs.count()).toBe(2);
  expect((await db.set_logs.toArray()).every((row) => row.session_id === session.id)).toBe(true);
  await finishSession(db, session.id, afterMidnight);
  const fresh = await loadedState();
  expect(fresh.doneSets).toEqual([]);
  expect(fresh.current?.setIndex).toBe(1);
});

it.each([
  [null, false, '2026-11-04'],
  [{ training_date: '2026-11-03', completed_at: null }, false, '2026-11-04'],
  [{ training_date: '2026-11-03', completed_at: null }, true, '2026-11-03'],
  [{ training_date: '2026-11-03', completed_at: '2026-11-03T22:00:00Z' }, true, '2026-11-04'],
  [{ training_date: '2026-10-20', completed_at: null }, true, '2026-11-04'],
])('chooses the midnight training date for %j with logged sets %s', (session, hasSets, expected) => {
  expect(trainingDate(localDate(new Date(afterMidnight)), session, hasSets)).toBe(expected);
});
