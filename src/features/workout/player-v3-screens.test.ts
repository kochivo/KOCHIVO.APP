import { createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { SnapshotExercise } from '@/core/offline';
import type { useFocusSession } from './hooks/use-focus-session';
import type { useWarmupSession } from './hooks/use-warmup-session';
import { WorkoutOverview } from './components/workout-overview';
import { WorkoutSet } from './components/workout-set';
import { SessionFeedback } from './components/session-feedback';
import { WorkoutValue } from './components/workout-value';
import { PlayerWorkoutV3 } from './components/player-workout-v3';
import { WorkoutClock } from './components/workout-clock';

const control = vi.hoisted(() => ({ index: 0, values: [] as unknown[], setters: [] as ReturnType<typeof vi.fn>[], save: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('react', async original => ({ ...await original<typeof React>(), useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }), useEffect: () => {}, useState: (initial: unknown) => {
  const index = control.index++;
  const setter = vi.fn(); control.setters[index] = setter;
  return [index in control.values ? control.values[index] : initial, setter];
} }));
vi.mock('@/lib/captain-workspace-enabled', () => ({ captainWorkspaceEnabled: () => true }));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'ar', useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'ar') }));
vi.mock('@/core/offline', () => ({ useLiveQuery: () => [], localDb: () => ({}) }));
vi.mock('./hooks/use-last-session', () => ({ useLastSession: () => ({ last: { sets: [{ set_index: 1, weight_kg: 75, reps: 8 }] }, ready: true }) }));
vi.mock('./components/finish-hero', () => ({ FinishHero: () => null }));
vi.mock('./data/session-feedback', () => ({ rpeValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], saveSessionFeedback: control.save }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }) }));
const exercise: SnapshotExercise = { id: 'bench', exercise_id: 'bench', position: 1, sets: 4, reps_min: 6, reps_max: 8,
  rest_seconds: 60, superset_group: null, rpe: null, tempo: null, notes: 'نزّل ببطء', name_ar: 'بنش بريس', name_en: 'Bench', media_path: null };
const state = { day: { id: 'day', title: 'صدر', position: 1, exercises: [exercise], warmup: { items: [], ramp: false } },
  current: { exercise, setIndex: 1 }, doneSets: [], queue: [{ exercise, setIndex: 1 }, { exercise, setIndex: 2 }],
  progress: 1, weight: 77.5, reps: 8, bodyweight: false, disabled: false, performance: { weight_kg: 75, reps: 8 },
  lastSession: null, rest: { remaining: 0 }, setWeight: vi.fn(), setReps: vi.fn(), complete: vi.fn(), edit: vi.fn(),
} as unknown as ReturnType<typeof useFocusSession>;
const progress = { checked: [], loading: false, error: false, toggle: vi.fn() } as unknown as ReturnType<typeof useWarmupSession>;
beforeEach(() => { control.index = 0; control.values = []; control.setters = []; control.save.mockReset().mockResolvedValue(undefined); });
function find(node: ReactNode, label: string): { onClick?: () => void; disabled?: boolean } | undefined {
  if (Array.isArray(node)) return node.map(child => find(child, label)).find(Boolean);
  if (!isValidElement<{ children?: ReactNode; onClick?: () => void; disabled?: boolean; 'aria-label'?: string }>(node)) return;
  if (node.props.children === label || node.props['aria-label'] === label) return node.props;
  return find(node.props.children, label);
}
function primaryCount(html: string) {
  return (html.match(/<button[^>]*class="[^"]*\bcontrol-primary\b(?!-)/g) ?? []).length;
}
it('shows superset groups and drop chips in the player program overview', () => {
  const first = { ...exercise, superset_group: 1, set_plan: [{ reps_min: 8, reps_max: 12, rir: 2,
    drop: { count: 2, percent: 20, mode: 'failure' as const, reps: null } }] };
  const second = { ...exercise, id: 'row2', exercise_id: 'row2', superset_group: 1 };
  const html = renderToStaticMarkup(createElement(WorkoutOverview, { state: { ...state,
    day: { ...state.day, id: 'day', title: 'Day', position: 1, exercises: [first, second] } }, progress, onStart() {}, onBack() {} }));
  expect(html).toContain('سوبرست A'); expect(html).toContain('A1'); expect(html).toContain('A2'); expect(html).toContain('دروب سيت');
});
function elementsOf(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(child => elementsOf(child, type));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return node.type === type ? [node as ReactElement<Record<string, unknown>>] : elementsOf(node.props.children, type);
}
it('has exactly one lime action on each of the three screens', () => {
  for (const element of [createElement(WorkoutOverview, { state, progress, onStart() {}, onBack() {} }),
    createElement(WorkoutSet, { state }), createElement(SessionFeedback, { sessionId: 's', hasFeedback: false })]) {
    control.index = 0;
    expect(primaryCount(renderToStaticMarkup(element))).toBe(1);
  }
});
it.each([['سهل', 3], ['مظبوط', 6], ['صعب', 9]] as const)('selecting %s picks RPE %s and enables submit', (label, value) => {
  const panel = SessionFeedback({ sessionId: 's', hasFeedback: false });
  expect(find(panel, 'ابعت للكابتن')?.disabled).toBe(true);
  find(panel, label)?.onClick?.();
  expect(control.setters[1]).toHaveBeenCalledExactlyOnceWith(value);
  control.index = 0; control.values = [false, value];
  expect(find(SessionFeedback({ sessionId: 's', hasFeedback: false }), 'ابعت للكابتن')?.disabled).toBe(false);
});
it('saves the selected RPE and note through the existing feedback action', () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000);
  try {
    control.values = [false, 6, 'كتفي'];
    find(SessionFeedback({ sessionId: 's', hasFeedback: false }), 'ابعت للكابتن')?.onClick?.();
    expect(control.save).toHaveBeenCalledWith({}, 's', { rpe: 6, note: 'كتفي' }, 1000);
  } finally { vi.restoreAllMocks(); }
});
it('keeps the existing 2.5kg and 1 rep steps with 56px controls', () => {
  const weight = vi.fn(), reps = vi.fn();
  find(WorkoutValue({ kind: 'weight', value: 75, disabled: false, invalid: false, onChange: weight }), 'زوّد الوزن 2.5')?.onClick?.();
  expect(weight).toHaveBeenCalledWith(77.5);
  find(WorkoutValue({ kind: 'reps', value: 8, disabled: false, invalid: false, onChange: reps }), 'قلّل العدّات')?.onClick?.();
  expect(reps).toHaveBeenCalledWith(7);
  expect(renderToStaticMarkup(createElement(WorkoutValue, { kind: 'weight', value: 75, disabled: false, invalid: false, onChange: weight }))).toContain('size-14');
});
it('binds the overview prescription and previous weight to the program and history', () => {
  const html = renderToStaticMarkup(createElement(WorkoutOverview, { state, progress, onStart() {}, onBack() {} }));
  expect(html).toContain('بنش بريس'); expect(html).toContain('4 × 6–8');
  expect(html).toContain('المرة اللي فاتت 75 كجم');
});
it('uses the finish label only for the last queued set and disables logging during rest', () => {
  expect(renderToStaticMarkup(createElement(WorkoutSet, { state }))).toContain('خلصت المجموعة');
  const html = renderToStaticMarkup(createElement(WorkoutSet, { state: { ...state, progress: 2, rest: { ...state.rest, remaining: 30 } } }));
  expect(html).toContain('خلصت التمرين');
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*class="[^"]*control-primary/);
});
it('preserves each value control’s identity when committing a typed weight or reps', () => {
  const initial = elementsOf(WorkoutSet({ state }), WorkoutValue);
  control.index = 0;
  const updated = elementsOf(WorkoutSet({ state: { ...state, weight: 80, reps: 9 } }), WorkoutValue);
  expect(updated.map(element => element.key)).toEqual(initial.map(element => element.key));
});
it('keeps the clock origin when the first logged set creates a session', () => {
  const start = '2026-11-13T10:00:00Z';
  control.values = [true, start];
  const resumed = { ...state, session: { started_at: '2026-11-13T10:02:00Z' } } as ReturnType<typeof useFocusSession>;
  const panel = PlayerWorkoutV3({ state: resumed, progress, online: true });
  expect(elementsOf(panel, WorkoutClock)[0]?.props.startedAt).toBe(start);
});
it('reopens a session loaded after mounting without replacing its original clock origin', () => {
  const start = '2026-11-13T10:00:00Z';
  control.values = [false, undefined];
  const resumed = { ...state, session: { started_at: start } } as ReturnType<typeof useFocusSession>;
  const panel = PlayerWorkoutV3({ state: resumed, progress, online: true });
  const onStart = elementsOf(panel, WorkoutOverview)[0]?.props.onStart;
  if (typeof onStart !== 'function') throw new Error('Start control missing');
  onStart();
  const update: unknown = control.setters[1]?.mock.calls[0]?.[0];
  if (typeof update !== 'function') throw new Error('Clock update missing');
  expect(update(undefined)).toBe(start);
});
