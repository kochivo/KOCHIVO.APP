import { createT } from '@/core/i18n/messages';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
  vi.doMock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar'), useLocale: () => 'ar' }));
  vi.doMock('react', () => ({
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
    useProgramSnapshot: () => ({ snapshot: { days: [day] }, status: 'ready', retry: async () => undefined }),
  }));
  vi.doMock('./hooks/use-rest-timer', () => ({
    useRestTimer: () => ({ remaining: 0, start: () => undefined }),
  }));
  await db.open();
});

afterEach(async () => {
  vi.clearAllTimers();
  vi.useRealTimers();
  await db.delete();
  vi.doUnmock('react');
  vi.doUnmock('@/core/i18n/client');
  vi.doUnmock('@/core/offline');
  vi.doUnmock('@/features/player-home');
  vi.doUnmock('./hooks/use-rest-timer');
  vi.doUnmock('./hooks/use-focus-session');
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

it('refreshes Cairo today on visible resume and focus, then removes its listeners', async () => {
  const effects: (() => void | (() => void))[] = [];
  const dates: unknown[] = [];
  let stateIndex = 0;
  vi.doMock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar'), useLocale: () => 'ar' }));
  vi.doMock('react', async (original) => ({
    ...await original<typeof React>(),
    useState: (initial: unknown) => {
      const index = stateIndex++;
      return [initial, (value: unknown) => { if (index === 0) dates.push(value instanceof Date ? localDate(value) : value); }];
    },
    useEffect: (effect: () => void | (() => void)) => { effects.push(effect); },
  }));
  vi.doMock('./hooks/use-focus-session', () => ({
    useFocusSession: () => ({ rest: { remaining: 0, endsAt: null }, doneSets: [], loading: true }),
  }));
  vi.doMock('./hooks/use-wake-lock', () => ({ useWakeLock: () => undefined }));
  vi.doMock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));
  const { FocusScreen } = await import('./components/focus-screen');
  const window = new EventTarget();
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', document);
  vi.stubGlobal('navigator', { onLine: true });
  vi.setSystemTime(beforeMidnight);
  FocusScreen({ dayId: day.id, playerId: 'player' });
  const cleanup = effects[0]?.();
  expect(dates).toEqual(['2026-11-03']);
  vi.setSystemTime(afterMidnight);
  document.visibilityState = 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
  expect(dates).toEqual(['2026-11-03']);
  document.visibilityState = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  expect(dates).toEqual(['2026-11-03', '2026-11-04']);
  vi.setSystemTime(Date.parse('2026-11-04T22:01:00Z'));
  window.dispatchEvent(new Event('focus'));
  expect(dates).toEqual(['2026-11-03', '2026-11-04', '2026-11-05']);
  cleanup?.();
  window.dispatchEvent(new Event('focus'));
  window.dispatchEvent(new Event('online'));
  window.dispatchEvent(new Event('offline'));
  document.dispatchEvent(new Event('visibilitychange'));
  expect(dates).toHaveLength(3);
});
