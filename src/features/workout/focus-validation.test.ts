import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/image', () => ({ default: () => null }));
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createT } from '@/core/i18n/messages';
import { KochivoDB, type SnapshotDay } from '@/core/offline';
import type * as Offline from '@/core/offline';
import type * as React from 'react';
import { startSession, logSet } from './data/log-set';

const now = Date.parse('2026-11-04T10:00:00Z');
const day: SnapshotDay = { id: 'day', title: 'Day', position: 1, exercises: [{
  id: 'item', exercise_id: 'exercise', position: 1, sets: 2, reps_min: 8, reps_max: 12,
  rest_seconds: 0, superset_group: null, rpe: null, tempo: null, notes: null,
  name_ar: null, name_en: 'Squat', media_path: null,
}] };
let db: KochivoDB;
let slots: unknown[];
let slot: number;
let queries: (() => unknown)[];
let values: unknown[];
let storage: Map<string, string>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ now, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  db = new KochivoDB('focus-validation');
  slots = []; slot = 0; queries = []; values = []; storage = new Map();
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  vi.doMock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar'), useLocale: () => 'ar' }));
  vi.doMock('react', async original => ({
    ...await original<typeof React>(),
    useState: (initial: unknown) => {
      const index = slot++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: unknown) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef: (current: unknown) => ({ current }),
    useCallback: <T,>(callback: T) => callback,
    useMemo: <T,>(callback: () => T) => callback(),
    useEffect: () => undefined,
  }));
  vi.doMock('@/core/offline', async original => ({
    ...await original<typeof Offline>(), localDb: () => db,
    useLiveQuery: (query: () => unknown) => { queries.push(query); return values[queries.length - 1]; },
  }));
  vi.doMock('@/features/player-home', () => ({
    useCycle: () => ({}), isLightDay: () => false,
    useProgramSnapshot: () => ({ snapshot: { days: [day] }, status: 'ready', retry() {} }),
  }));
  vi.doMock('./hooks/use-rest-timer', () => ({ useRestTimer: () => ({ remaining: 0, start() {}, skip() {} }) }));
  await db.open();
});

afterEach(async () => {
  vi.clearAllTimers(); vi.useRealTimers();
  await db.delete();
  for (const path of ['react', '@/core/i18n/client', '@/core/offline', '@/features/player-home', './hooks/use-rest-timer']) vi.doUnmock(path);
  vi.unstubAllGlobals();
});

async function render() {
  const { useFocusSession: renderSession } = await import('./hooks/use-focus-session');
  for (let pass = 0; pass < 3; pass++) {
    slot = 0; queries = [];
    renderSession('day', '2026-11-04');
    values = await Promise.all(queries.map(query => query()));
  }
  slot = 0; queries = [];
  return renderSession('day', '2026-11-04');
}

it('keeps completion tappable, shows the Arabic error, and queues no invalid set', async () => {
  let state = await render();
  expect(state.weight).toBe(0);
  expect(state.reps).toBe(8);
  expect(state.disabled).toBe(false);
  await state.complete();
  state = await render();
  expect(state.invalid?.result).toBe('weight');
  expect(await db.set_logs.count()).toBe(0);
  expect(await db.workout_sessions.count()).toBe(0);
  expect(await db.outbox.count()).toBe(0);
  const { SetControls } = await import('./components/set-controls');
  const html = renderToStaticMarkup(createElement(SetControls, { state }));
  expect(html).toContain('حط الوزن والعدات الأول');
  expect(html).toContain('aria-describedby="set-error"');
  const buttons = [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs)];
  expect(buttons.find(button => button[2]?.includes('إنهاء المجموعة'))?.[1]).not.toContain('disabled=""');
});

it('remembers bodyweight per exercise and logs zero weight only with positive reps', async () => {
  let state = await render();
  state.setBodyweight(true);
  state = await render();
  state.setReps(0);
  state = await render();
  await state.complete();
  state = await render();
  expect(state.invalid?.result).toBe('reps');
  const { SetControls } = await import('./components/set-controls');
  const html = renderToStaticMarkup(createElement(SetControls, { state }));
  expect(html).toContain('حط عدد العدات');
  expect(html).not.toContain('aria-label="الوزن كجم"');
  expect(await db.set_logs.count()).toBe(0);
  slots = []; values = [];
  state = await render();
  expect(state.bodyweight).toBe(true);
  await state.complete();
  expect((await db.set_logs.toArray())[0]).toMatchObject({ weight_kg: 0, reps: 8 });
});

it('validates edits too and saves corrected values through the outbox', async () => {
  const session = await startSession(db, day, '2026-11-04', now);
  await logSet(db, { session_id: session.id, program_exercise_id: 'item', exercise_id: 'exercise', set_index: 1, weight_kg: 60, reps: 8 }, now);
  const row = await db.set_logs.toCollection().first();
  if (!row) throw new Error('Missing set fixture');
  let state = await render();
  state.edit(row);
  state = await render();
  state.setWeight(0);
  state = await render();
  await state.complete();
  expect((await db.set_logs.get(row.id))?.weight_kg).toBe(60);
  state.setWeight(65);
  state = await render();
  await state.complete();
  expect((await db.set_logs.get(row.id))?.weight_kg).toBe(65);
  expect(await db.set_logs.count()).toBe(1);
});

it('focuses the invalid stepper on each completion attempt', async () => {
  let state = await render();
  await state.complete();
  state = await render();
  const weightFocus = vi.fn();
  const repsFocus = vi.fn();
  let ref = 0;
  vi.resetModules();
  vi.doMock('react', async original => ({
    ...await original<typeof React>(),
    useRef: () => ({ current: { focus: ref++ === 0 ? weightFocus : repsFocus } }),
    useEffect: (effect: () => void) => effect(),
  }));
  const { SetControls } = await import('./components/set-controls');
  SetControls({ state });
  expect(weightFocus).toHaveBeenCalledOnce();
  expect(repsFocus).not.toHaveBeenCalled();
  ref = 0;
  SetControls({ state: { ...state, invalid: { key: 'test', result: 'reps', attempt: 2 } } });
  expect(repsFocus).toHaveBeenCalledOnce();
});
