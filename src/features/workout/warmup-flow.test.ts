import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { KochivoDB, type SnapshotDay } from '@/core/offline';
import { LocaleProvider } from '@/core/i18n/client';
import { FocusScreen } from './components/focus-screen';
import { WarmupWorkout } from './components/warmup-workout';

vi.mock('server-only', () => ({}));
const exercise = { id: 'bench', exercise_id: 'bench', position: 1, sets: 2, reps_min: 8, reps_max: 8,
  rest_seconds: 60, superset_group: null, rpe: null, tempo: null, notes: null,
  name_ar: 'بنش برس بالبار', name_en: 'Bench press', media_path: null };
const state = vi.hoisted(() => ({ day: null as SnapshotDay | null, painStopped: false }));
const progress = vi.hoisted(() => ({ checked: [] as string[], skipped: false, loading: false, pending: true,
  toggle: vi.fn(), skip: vi.fn() }));
vi.mock('./hooks/use-warmup-session', () => ({ useWarmupSession: () => progress }));
vi.mock('./hooks/use-focus-session', () => ({ useFocusSession: () => ({ day: state.day,
  current: state.painStopped ? undefined : { exercise, setIndex: 1 },
  finished: state.painStopped, painSkipped: state.painStopped ? 1 : 0, session: state.painStopped ? { id: 'stopped' } : undefined,
  doneSets: [], queue: state.painStopped ? [] : [{ exercise, setIndex: 1 }], progress: 1, rest: { remaining: 0, endsAt: null },
  lastSession: { sets: [{ weight_kg: 63, reps: 8, set_index: 1 }] }, weight: 63, reps: 8, bodyweight: false,
  disabled: false, loading: false, setWeight() {}, setReps() {}, setBodyweight() {}, complete() {} }) }));
vi.mock('./hooks/use-wake-lock', () => ({ useWakeLock() {} }));
vi.mock('./components/media-status', () => ({ MediaStatus: () => null }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-07T12:00:00Z'), online: false }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }) }));
vi.mock('next/dynamic', () => ({ default: (loader: () => unknown) => loader.toString().includes('warmup-workout')
  ? (props: Parameters<typeof WarmupWorkout>[0]) => createElement(WarmupWorkout, props)
  : loader.toString().includes('session-feedback') ? ({ onSavedHome }: { onSavedHome?: () => void }) =>
    createElement('div', { 'data-v4-finish': Boolean(onSavedHome) }) : () => null }));
const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(FocusScreen, { dayId: 'day' })));
beforeEach(() => {
  state.day = { id: 'day', title: 'دفع · صدر وكتف', position: 1, exercises: [exercise] };
  state.painStopped = false;
  Object.assign(progress, { checked: [], skipped: false, pending: true, loading: false });
});
afterEach(() => vi.unstubAllEnvs());
it('renders an old cached snapshot without a warm-up card and keeps normal controls', async () => {
  const db = new KochivoDB('old-warmup-cache');
  try {
    if (!state.day) throw new Error('Fixture missing');
    await db.program_snapshot.put({ id: 'active', player_id: 'player', program_id: 'p', title: 'Plan', notes: null,
      settings: {}, training_days: [], days: [state.day] });
    state.day = (await db.program_snapshot.get('active'))?.days[0] ?? null;
    const html = render();
    expect(html).toContain('بنش برس بالبار');
    expect(html).toContain('إنهاء المجموعة');
    expect(html).not.toContain('سخّن الأول');
    expect(html).not.toContain('كمّل التسخين');
  } finally { await db.delete(); }
});
it('shows the warm-up before the exercises and gates logging until completion or skip', () => {
  if (!state.day) throw new Error('Fixture missing');
  state.day.warmup = { items: [{ id: 'a', name: 'عجلة خفيفة', amount: 5, unit: 'min' }], ramp: true };
  const html = render();
  expect(html.indexOf('1 · سخّن الأول')).toBeLessThan(html.indexOf('2 · التمارين'));
  expect(html).toContain('كمّل التسخين');
  expect(html).toContain('تخطّي التسخين');
  for (const label of ['النهارده · السبت', 'تمريني', 'أكلي', 'تقدمي', 'أنا']) expect(html).toContain(label);
  expect(html.match(/دفع · صدر وكتف/g)).toHaveLength(1);
  expect(html).not.toContain('إنهاء المجموعة');
  for (const skipped of [false, true]) {
    Object.assign(progress, { pending: false, skipped, checked: skipped ? [] : ['a'] });
    const continued = render();
    expect(continued).toContain('إنهاء المجموعة');
    expect(continued).not.toContain('كمّل التسخين');
    expect(continued).toContain('من غير نت');
    expect(continued).toContain('role="progressbar"');
  }
});
it.each([false, true])('keeps the v3 overview, checklist and history until explicitly started (skipped: %s)', skipped => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  if (!state.day) throw new Error('Fixture missing');
  state.day.warmup = { items: [{ id: 'a', name: 'عجلة خفيفة', amount: 5, unit: 'min' }], ramp: true };
  Object.assign(progress, { pending: false, skipped, checked: skipped ? [] : ['a'] });
  const html = render();
  expect(html).toContain('من غير نت');
  expect(html).toContain('ابدأ التمرين');
  expect(html).toContain('1 · التسخين');
  expect(html).toContain('id="workout-exercises"');
  expect(html).toContain('href="/player/history"');
  expect(html).not.toContain('خلصت المجموعة');
});
it('reaches the v4 finish through FocusScreen when pain removes the whole queue', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  state.painStopped = true;
  expect(render()).toContain('data-v4-finish="true"');
});
