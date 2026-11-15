import { createT } from '@/core/i18n/messages';
import type * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { KochivoDB, stableId, type SnapshotDay, type SnapshotExercise } from '@/core/offline';
import type * as Offline from '@/core/offline';
import { buildQueue } from './queue';
import { extendRest, formatRest, restRemaining } from './rest';
import { sessionId, setId } from './ids';
import { finishSession, logSet, startSession } from './data/log-set';
import { lastSession, performanceFor } from './data/last-performance';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RestPanel } from './components/rest-panel';
import { SetDots } from './components/set-dots';
import { DonePanel } from './components/done-panel';
import { liveQuery } from 'dexie';
import { detectPr } from './pr';
import { prHistory } from './data/pr-history';
describe('personal records', () => {
  const best = { weight_kg: 80, reps: 5 };
  it.each([
    [[], { weight_kg: 80, reps: 5 }, null],
    [[best], { weight_kg: 82.5, reps: 1 }, { kind: 'weight', previous: best }],
    [[best, { weight_kg: 80, reps: 3 }], { weight_kg: 80, reps: 6 }, { kind: 'reps', previous: best }],
    [[best], { weight_kg: 80, reps: 5 }, null],
    [[best], { weight_kg: 60, reps: 20 }, null],
    [[best], { weight_kg: 90, reps: 0 }, null],
    [[{ weight_kg: 100, reps: 0 }, best], { weight_kg: 85, reps: 5 }, { kind: 'weight', previous: best }],
    [[best], { weight_kg: null, reps: 5 }, null],
  ])('compares valid history %j with %j', (history, set, expected) => {
    expect(detectPr(history, set)).toEqual(expected);
  });
  it('reads all sessions for one exercise, excluding the saved id and deleted rows', async () => {
    await db.open();
    const input = { program_exercise_id: 'a', exercise_id: 'a', set_index: 1, weight_kg: 80, reps: 5 };
    await logSet(db, { ...input, session_id: 'old' }, now);
    await logSet(db, { ...input, session_id: 'deleted', weight_kg: 100 }, now);
    await logSet(db, { ...input, session_id: 'current', weight_kg: 85 }, now);
    await logSet(db, { ...input, session_id: 'other', exercise_id: 'b' }, now);
    await db.set_logs.update(await setId('deleted', 'a', 1), { deleted_at: new Date(now).toISOString() });
    const history = await prHistory(db, 'a', await setId('current', 'a', 1));
    expect(history.map((row) => row.session_id)).toEqual(['old']);
    expect(detectPr(history, { weight_kg: 85, reps: 5 })).toEqual({
      kind: 'weight', previous: { weight_kg: 80, reps: 5 },
    });
  });
});
const exercise = (id: string, position: number, group: number | null = null, sets = 2): SnapshotExercise => ({
  id, exercise_id: id, position, sets, reps_min: 8, reps_max: 12, rest_seconds: position * 30,
  superset_group: group, rpe: null, tempo: null, notes: null, name_ar: null, name_en: id, media_path: null,
});
const day: SnapshotDay = { id: 'day', title: 'صدر', position: 1, exercises: [exercise('a', 1)] };
const now = Date.parse('2026-11-03T10:00:00Z');
const db = new KochivoDB('workout-test');
afterEach(async () => {
  vi.useRealTimers();
  await db.delete();
  vi.unstubAllGlobals();
  vi.doUnmock('react');
  vi.doUnmock('@/core/i18n/client');
  vi.doUnmock('@/core/offline');
  vi.doUnmock('@/features/player-home');
});
describe('queue', () => {
  it('orders plain exercises and removes only the final rest without mutating the day', () => {
    const input = { ...day, exercises: [exercise('b', 2), exercise('a', 1)] };
    expect(buildQueue(input).map((s) => [s.exercise.id, s.setIndex, s.restAfter])).toEqual([
      ['a', 1, 30], ['a', 2, 30], ['b', 1, 60], ['b', 2, 0],
    ]);
    expect(input.exercises[0]?.id).toBe('b');
    expect(buildQueue({ ...day, exercises: [] })).toEqual([]);
  });
  it('runs supersets in rounds with the last exercise rest at round end', () => {
    expect(buildQueue({ ...day, exercises: [exercise('b', 2, 1), exercise('a', 1, 1), exercise('c', 3)] })
      .map((s) => [s.exercise.id, s.setIndex, s.restAfter])).toEqual([
      ['a', 1, 0], ['b', 1, 60], ['a', 2, 0], ['b', 2, 60], ['c', 1, 90], ['c', 2, 0],
    ]);
  });
  it('handles unequal rounds and removes the final superset rest', () => {
    expect(buildQueue({ ...day, exercises: [exercise('a', 1, 0, 3), exercise('b', 2, 0)] })
      .map((s) => [s.exercise.id, s.setIndex, s.restAfter])).toEqual([
      ['a', 1, 0], ['b', 1, 60], ['a', 2, 0], ['b', 2, 60], ['a', 3, 0],
    ]);
  });
});
it('computes rest from timestamps, clamps expired rests, formats and extends', () => {
  expect(restRemaining(now + 1001, now)).toBe(2);
  expect(restRemaining(now - 1000, now)).toBe(0);
  expect(restRemaining(null, now)).toBe(0);
  expect(extendRest(now + 1000, now, 30)).toBe(now + 31000);
  expect(extendRest(now - 1000, now, 30)).toBe(now + 30000);
  expect(formatRest(65)).toBe('1:05');
  expect(formatRest(0)).toBe('0:00');
});
it('uses the stable session and set namespaces', async () => {
  expect(await sessionId('day', '2026-11-03')).toBe(await stableId('session', 'day', '2026-11-03'));
  expect(await setId('s', 'a', 1)).toBe(await stableId('set', 's', 'a', '1'));
});
it('starts a session idempotently, including concurrent starts, and finishes it', async () => {
  await db.open();
  const [first, second] = await Promise.all([
    startSession(db, day, '2026-11-03', now), startSession(db, day, '2026-11-03', now + 1),
  ]);
  expect(second.id).toBe(first.id);
  expect(await db.workout_sessions.count()).toBe(1);
  expect((await db.outbox.toArray())[0]?.revision).toBe(1);
  await finishSession(db, first.id, now + 1000);
  expect(await db.workout_sessions.get(first.id)).toMatchObject({ completed_at: new Date(now + 1000).toISOString() });
});
it('updates the same set and keeps one outbox entry at revision 2', async () => {
  await db.open();
  const session = await startSession(db, day, '2026-11-03', now);
  const input = { session_id: session.id, program_exercise_id: 'a', exercise_id: 'a', set_index: 1, weight_kg: 60, reps: 8 };
  await logSet(db, input, now);
  await logSet(db, { ...input, weight_kg: 62.5 }, now + 1000);
  expect(await db.set_logs.count()).toBe(1);
  expect((await db.set_logs.toArray())[0]).toMatchObject({ weight_kg: 62.5, completed_at: new Date(now + 1000).toISOString() });
  const entries = (await db.outbox.toArray()).filter((entry) => entry.table === 'set_logs');
  expect(entries).toHaveLength(1);
  expect(entries[0]?.revision).toBe(2);
});
it('returns the latest other-session performance and ignores deleted rows', async () => {
  await db.open();
  const lastPerformance = async () => performanceFor(await lastSession(db, 'a', 'current'), 1);
  expect(await lastPerformance()).toBeNull();
  const input = { program_exercise_id: 'a', exercise_id: 'a', set_index: 1, weight_kg: 60, reps: 8 };
  await logSet(db, { ...input, session_id: 'old' }, now);
  await logSet(db, { ...input, session_id: 'recent', weight_kg: 65 }, now + 1000);
  await logSet(db, { ...input, session_id: 'current', weight_kg: 70 }, now + 2000);
  expect(await lastPerformance()).toEqual({ weight_kg: 65, reps: 8 });
  await db.set_logs.update(await setId('recent', 'a', 1), { deleted_at: new Date(now + 3000).toISOString() });
  expect(await lastPerformance()).toEqual({ weight_kg: 60, reps: 8 });
});
it('renders an accessible rest countdown with reduced-motion-safe flashing', () => {
  const html = renderToStaticMarkup(createElement(RestPanel, {
    remaining: 3, flashing: true, onExtend: () => undefined, onSkip: () => undefined,
  }));
  expect(html).toContain('aria-live="off"');
  expect(html).toContain('0:03');
  expect(html).toContain('motion-safe:animate-pulse');
  expect(html).toContain('+30 ث');
});
it('renders empty sets and the local-save completion message', () => {
  expect(renderToStaticMarkup(createElement(SetDots, {
    exercise: { ...exercise('a', 1), sets: 0 }, currentIndex: 1, doneSets: [], onEdit: () => undefined,
  }))).toContain('مفيش مجموعات');
  const html = renderToStaticMarkup(createElement(DonePanel));
  expect(html).toContain('خلصت التمرين');
  expect(html).toContain('href="/player"');
  expect(html).toContain('اتسجّل على موبايلك');
});
it('restores rest after a lock, vibrates once, persists extensions and cleans up', async () => {
  vi.useFakeTimers({ now });
  const states: unknown[] = [];
  let stateIndex = 0;
  let mount: (() => (() => void)) | undefined;
  vi.doMock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar'), useLocale: () => 'ar' }));
  vi.doMock('react', async original => ({
    ...await original<typeof React>(),
    useState: (initial: unknown) => {
      const index = stateIndex++;
      states[index] = initial;
      return [initial, (value: unknown) => { states[index] = value; }];
    },
    useRef: (current: unknown) => ({ current }), useCallback: <T,>(callback: T) => callback,
    useEffect: (effect: () => (() => void)) => { mount = effect; },
  }));
  const document = new EventTarget();
  const vibrate = vi.fn();
  const storage = new Map([['kochivo:rest-ends-at', String(now + 5000)]]);
  vi.stubGlobal('document', document);
  vi.stubGlobal('navigator', { vibrate });
  vi.stubGlobal('window', globalThis);
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  const { useRestTimer } = await import('./hooks/use-rest-timer');
  const timer = useRestTimer();
  const cleanup = mount?.();
  expect(states[1]).toBe(5);
  vi.setSystemTime(now + 4000);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(states[1]).toBe(1);
  vi.setSystemTime(now + 6000);
  document.dispatchEvent(new Event('visibilitychange'));
  document.dispatchEvent(new Event('visibilitychange'));
  expect(states[1]).toBe(0);
  expect(vibrate).toHaveBeenCalledExactlyOnceWith([200, 100, 200]);
  timer.extend();
  expect(storage.get('kochivo:rest-ends-at')).toBe(String(now + 36000));
  timer.skip();
  expect(storage.size).toBe(0);
  cleanup?.();
  expect(vi.getTimerCount()).toBe(0);
  const firstLock = { released: false, release: vi.fn(async () => undefined) };
  const secondLock = { released: false, release: vi.fn(async () => undefined) };
  const request = vi.fn().mockResolvedValueOnce(firstLock).mockResolvedValueOnce(secondLock);
  vi.stubGlobal('navigator', { wakeLock: { request } });
  Object.assign(document, { visibilityState: 'visible' });
  const { useWakeLock } = await import('./hooks/use-wake-lock');
  useWakeLock();
  const release = mount?.();
  await Promise.resolve();
  expect(request).toHaveBeenCalledExactlyOnceWith('screen');
  firstLock.released = true;
  document.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();
  expect(request).toHaveBeenCalledTimes(2);
  release?.();
  expect(secondLock.release).toHaveBeenCalledTimes(1);
});
it('keeps the session live query read-only so a missing session can load', async () => {
  vi.resetModules();
  vi.doMock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar'), useLocale: () => 'ar' }));
  const queries: (() => unknown)[] = [];
  vi.doMock('react', async original => ({
    ...await original<typeof React>(),
    useState: (initial: unknown) => [initial, () => undefined],
    useRef: (current: unknown) => ({ current }), useCallback: <T,>(callback: T) => callback,
    useMemo: <T,>(callback: () => T) => callback(), useEffect: () => undefined,
  }));
  vi.doMock('@/core/offline', async (original) => ({
    ...await original<typeof Offline>(), localDb: () => db,
    useLiveQuery: (query: () => unknown) => {
      queries.push(query);
      return [undefined, 0, null, [], null, [], null, null, 0][queries.length - 1];
    },
  }));
  vi.doMock('@/features/player-home', () => ({
    useCycle: () => ({}), isLightDay: () => false,
    useProgramSnapshot: () => ({ snapshot: { days: [day] }, status: 'ready', retry: async () => undefined }),
  }));
  const { useFocusSession } = await import('./hooks/use-focus-session');
  expect(useFocusSession(day.id, '2026-11-03', 'player').loading).toBe(false);
  const query = queries[2]; if (!query) throw new Error('Session query missing');
  await db.open();
  const observable = liveQuery(query);
  let unsubscribe: () => void = () => undefined;
  try {
    const result = await new Promise((resolve, reject) => {
      const subscription = observable.subscribe({ next: resolve, error: reject });
      unsubscribe = () => subscription.unsubscribe();
    });
    expect(result).toBeNull();
    expect(await db.workout_sessions.count()).toBe(0);
  } finally { unsubscribe(); }
});
