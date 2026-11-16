import { createElement } from 'react';
import type * as React from 'react';
import type * as Offline from '@/core/offline';
import { KochivoDB } from '@/core/offline/db';
import { startSession } from './data/log-set';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { PainSheet } from './components/pain-sheet';
import { PainAfterSend } from './components/pain-after-send';
import { PainLoadHint } from './components/pain-load-hint';

vi.mock('@/core/i18n/client', () => ({ useT: (m: Parameters<typeof createT>[0]) => createT(m, 'en'), useLocale: () => 'en' }));
const report = { id: 'report', captain_id: 'captain', player_id: 'player', session_id: null, program_exercise_id: null,
  set_index: 3, area: 'knee_r' as const, severity: 5, kind: 'sharp' as const, side_view: 'front' as const,
  created_at: '2026-11-15T10:00:00Z', status: 'open' as const, reply: null, answered_at: null };
const noop = () => {};
it('lets an unaffected exercise continue without offering a swap or claiming it stopped', () => {
  const props = { report: { ...report, severity: 2, kind: 'strain' as const }, exercise: 'Bench press',
    affected: false, onContinue: noop, onSkip: noop, onSwap: noop, alternative: 'Curl' };
  const html = renderToStaticMarkup(createElement(PainAfterSend, props));
  expect(html).toContain('Continue the workout');
  expect(html).toContain('Stop this exercise anyway');
  expect(html).toContain('doesn&#x27;t load your Right knee');
  expect(html).not.toContain('Stopped Bench press');
  expect(html).not.toContain('Use the swap');
  expect(html).toContain("If it&#x27;s sharp or swollen, stop and see a doctor.");
});
it.each([
  { severity: 5, kind: 'strain' as const },
  { severity: 2, kind: 'sharp' as const },
])('stops even an unaffected exercise for urgent pain %j', urgent => {
  const props = { report: { ...report, ...urgent }, exercise: 'Bench press', affected: false,
    onContinue: noop, onSkip: noop, onSwap: noop };
  const html = renderToStaticMarkup(createElement(PainAfterSend, props));
  expect(html).toContain('Stopped Bench press');
  expect(html).not.toContain('Continue the workout');
  expect(html.indexOf('text-danger')).toBeLessThan(html.indexOf('Stopped Bench press'));
});
it('renders the sheet with accessible body choices, severity and kind', () => {
  const html = renderToStaticMarkup(createElement(PainSheet, { onClose: noop, onSend: async () => {}, exercise: 'Squat' }));
  expect(html).toContain('Where does it hurt?');
  expect(html).toContain('Right knee');
  expect(html).toContain('How bad?');
  expect(html).toContain('Send to coach');
  expect(html).toContain('Sharp');
});
it('always shows the doctor note and exposes a swap only when safe', () => {
  const props = { report, exercise: 'Squat', affected: true, onContinue: noop, onSkip: noop, onSwap: noop };
  const without = renderToStaticMarkup(createElement(PainAfterSend, props));
  expect(without).toContain("If it&#x27;s sharp or swollen, stop and see a doctor.");
  expect(without).not.toContain('Use the swap');
  const withSwap = renderToStaticMarkup(createElement(PainAfterSend, { ...props, alternative: 'Curl' }));
  expect(withSwap).toContain('Use the swap');
  expect(withSwap).toContain('Curl');
});
it('shows reduced targets and a skip action for rest, hiding expired hints', () => {
  const props = { today: '2026-11-15', weight: 80, onSkip: noop };
  const hint = { player_id: 'player', program_exercise_id: 'row', factor: 0.8, until: '2026-11-15' };
  expect(renderToStaticMarkup(createElement(PainLoadHint, { ...props, hint }))).toContain('80');
  expect(renderToStaticMarkup(createElement(PainLoadHint, { ...props, hint: { ...hint, factor: 0 } }))).toContain('Skip this exercise');
  expect(renderToStaticMarkup(createElement(PainLoadHint, { ...props, hint: { ...hint, until: '2026-11-14' } }))).toBe('');
});

it.each(['chest', 'upper legs'])('keeps an unaffected current set writable and checks later %s exercises', async bodyPart => {
  const now = Date.parse('2026-11-15T10:00:00Z');
  const db = new KochivoDB('pain-unaffected-session');
  const day = { id: 'day', title: 'Push', position: 1, exercises: [1, 2].map(n => ({
    id: `row${n}`, exercise_id: `exercise${n}`, position: n, sets: 1, reps_min: 8, reps_max: 12,
    rest_seconds: 0, superset_group: null, rpe: null, tempo: null, notes: null,
    name_ar: null, name_en: 'Bench press', media_path: null, body_part: n === 1 ? 'chest' : bodyPart,
    pattern: 'pull', alternatives: n === 2 ? ['safe', 'affected'] : [],
    alternative_exercises: n === 2 ? ['safe', 'affected'].map(id => ({ id, name_ar: null, name_en: id,
      media_path: null, body_part: id === 'safe' ? 'back' : 'upper legs', pattern: 'pull', stress: [] })) : [],
  })) };
  const slots: unknown[] = [];
  let slot = 0, queries: (() => unknown)[] = [], values: unknown[] = [];
  vi.resetModules();
  vi.useFakeTimers({ now, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.stubGlobal('window', { localStorage: { getItem: () => null, setItem() {} } });
  vi.doMock('react', async original => ({ ...await original<typeof React>(),
    useState: (initial: unknown) => {
      const index = slot++; if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: unknown) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef: (current: unknown) => ({ current }), useCallback: <T,>(callback: T) => callback,
    useMemo: <T,>(callback: () => T) => callback(), useEffect: () => undefined,
  }));
  vi.doMock('server-only', () => ({}));
  vi.doMock('@/core/offline', async original => ({ ...await original<typeof Offline>(), localDb: () => db,
    useLiveQuery: (query: () => unknown) => { queries.push(query); return values[queries.length - 1]; },
  }));
  vi.doMock('@/features/player-home', () => ({ useCycle: () => ({}), isLightDay: () => false,
    useProgramSnapshot: () => ({ snapshot: { days: [day] }, status: 'ready', retry() {} }) }));
  vi.doMock('@/features/readiness', () => ({ useTodayDecision: () => null, reducedSets: (sets: number) => sets }));
  vi.doMock('./hooks/use-rest-timer', () => ({ useRestTimer: () => ({ remaining: 0, start() {}, skip() {} }) }));
  try {
    await db.open();
    const session = await startSession(db, day, '2026-11-15', now);
    await db.pain_reports.put({ ...report, severity: 2, kind: 'strain', session_id: session.id, program_exercise_id: 'row1' });
    const { useFocusSession: renderSession } = await import('./hooks/use-focus-session');
    async function render() {
      for (let pass = 0; pass < 5; pass++) {
        slot = 0; queries = []; renderSession(day.id, '2026-11-15');
        values = await Promise.all(queries.map(query => query()));
      }
      slot = 0; queries = []; return renderSession(day.id, '2026-11-15');
    }
    let state = await render();
    expect(state.current).toMatchObject({ exercise: { id: 'row1' }, setIndex: 1 });
    expect(state.painBlocked).toBe(false);
    state.setWeight(50); state = await render();
    state.setReps(8); state = await render(); await state.complete();
    expect(await db.set_logs.count()).toBe(1);
    state = await render();
    expect(state.current?.exercise.id).toBe('row2');
    expect(state.painBlocked).toBe(bodyPart === 'upper legs');
    expect(state.painCarried).toHaveLength(bodyPart === 'upper legs' ? 1 : 0);
    if (state.painBlocked) {
      await state.complete();
      expect(await db.set_logs.count()).toBe(1);
      expect(state.queue).toHaveLength(2);
      state.switchExercise('affected'); state = await render();
      expect(state.current?.exercise.exercise_id).toBe('exercise2');
      state.switchExercise('safe'); state = await render();
      expect(state.current?.exercise.exercise_id).toBe('safe');
      expect(state.painBlocked).toBe(false);
      expect(state.painCarried).toEqual([]);
    }
  } finally {
    vi.clearAllTimers(); vi.useRealTimers(); await db.delete(); vi.unstubAllGlobals();
    for (const path of ['react', 'server-only', '@/core/offline', '@/features/player-home', '@/features/readiness', './hooks/use-rest-timer']) vi.doUnmock(path);
    vi.resetModules();
  }
});
