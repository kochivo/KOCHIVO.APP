import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { MealLogRow, NutritionMeal, ProgramSnapshot, SnapshotDay, WorkoutSessionRow } from '@/core/offline';
import type * as Offline from '@/core/offline';
import type * as Nutrition from '@/features/nutrition';
import type { VoiceNote } from '@/features/voice-notes';
import { V3Home } from './components/v3-home';
import { waterGlasses } from './components/home-metrics';
import { NextTaskCard } from './components/next-task-card';
import { NutritionSlot } from './components/nutrition-slot';
import { TodayCard } from './components/today-card';

const state = vi.hoisted(() => ({
  notes: [] as VoiceNote[], history: { accountStart: '2026-11-07', completedDates: ['2026-11-09'] },
  meals: [] as NutritionMeal[], logs: [] as MealLogRow[], awaitingPlansAt: null as string | null,
}));
vi.mock('@/core/resource', () => ({ useResource: () => ({ status: 'ready', data: {
  latest: state.notes.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    ? { ...state.notes.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0], body: null, voice: true } : null,
  unread: state.notes.some(note => !note.listenedAt),
}, retry() {} }) }));
vi.mock('./hooks/use-streak-sessions', () => ({ useStreakSessions: () => state.history }));
vi.mock('@/features/player-shell', () => ({ useCaptainContext: () => ({ data: { fullName: 'محمود', captainId: 'c', awaitingPlansAt: state.awaitingPlansAt }, status: 'ready', retry() {} }) }));
vi.mock('@/core/offline', async original => ({ ...await original<typeof Offline>(), useLiveQuery: () => ({ water_ml: 1250 }) }));
vi.mock('@/features/nutrition', async original => ({
  ...await original<typeof Nutrition>(),
  useNutritionSnapshot: () => ({ snapshot: { id: 'active', player_id: 'player', plan_id: 'plan', title: 'Plan',
    targets: { kcal: 2000, protein: null, carbs: null, fat: null }, meals: state.meals },
    status: 'ready', today: '2026-11-11', retryKey: 0, onError() {}, retry() {} }),
  useMealLogs: (date: string) => state.logs.filter(log => log.log_date === date && !log.deleted_at),
}));

state.meals = [{ id: 'breakfast', name: 'الفطار', position: 0, items: [{ id: 'food', name: 'Food',
  position: 0, grams: 200, photo_path: null, per100g: { kcal: 430, protein: 20, carbs: 30, fat: 10 }, alternatives: [] }] },
{ id: 'meal', name: 'الغدا', position: 1, items: [] }];
state.logs = [{ id: 'log', meal_id: 'breakfast', log_date: '2026-11-11', swaps: {},
  completed_at: '2026-11-11T07:00:00Z', client_updated_at: '2026-11-11T07:00:00Z', deleted_at: null }];

const day: SnapshotDay = { id: 'push', title: 'صدر وترايسبس', position: 1, exercises: [{
  id: 'pe', exercise_id: 'e', position: 1, sets: 3, reps_min: 8, reps_max: 12,
  rest_seconds: 60, superset_group: null, rpe: null, tempo: null, notes: null,
  name_ar: 'بنش', name_en: 'Bench', media_path: null,
}], warmup: { ramp: false, items: [{ id: 'warm', name: 'Walk', amount: 2, unit: 'min' }] } };
const snapshot: ProgramSnapshot = { id: 'active', player_id: 'player', program_id: 'p', title: 'Plan',
  notes: null, settings: {}, training_days: [1, 3, 5], days: [day] };
const sessions: WorkoutSessionRow[] = [{ id: 'session', program_day_id: 'push', training_date: '2026-11-09',
  started_at: '2026-11-09T10:00:00Z', completed_at: '2026-11-09T11:00:00Z', client_updated_at: '2026-11-09T11:00:00Z' }];
const note: VoiceNote = { id: 'voice', url: '/audio', durationSeconds: 24, listenedAt: null,
  createdAt: '2026-11-10T10:00:00Z', contextId: null };
function render(rest = false, today = '2026-11-11', program = snapshot, history = sessions) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(V3Home, {
    now: new Date(`${today}T08:00:00Z`), today, firstName: 'أحمد', playerId: 'player',
    snapshot: program, day, rest, weekSessions: history, sessions: history, onPreview() {},
  })));
}
afterEach(() => { state.notes = []; vi.unstubAllEnvs(); });

it('shows a calm waiting line in the hero area while the coach prepares plans', () => {
  state.awaitingPlansAt = '2026-11-01T10:00:00Z';
  try { expect(render()).toContain('الكابتن بيجهزلك الأنظمة، اشتراكك هيبدأ أول ما تجهز'); }
  finally { state.awaitingPlansAt = null; }
});

it('shows one primary workout action and real workout, calorie, water and weekly data', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = render();
  expect(html).toContain('صدر وترايسبس');
  expect(html).toContain('فيه تسخين');
  expect(html).toContain('43%');
  expect(html).toContain('الجاي: الغدا');
  expect(html).toContain('href="#home-morning"');
  expect(html).toContain('href="/player/history"');
  expect(html).toContain('href="/player/rank"');
  expect(html.replace(/<[^>]*>/g, '')).toContain('1 / 3');
  expect(html.match(/<a\b[^>]*class="[^"]*\bcontrol-primary\b[^"/]*"/g)).toHaveLength(1);
  expect(html).toContain('يلا نبدأ');
  const task = renderToStaticMarkup(createElement(NextTaskCard, { task: { kind: 'start', href: '/player/workout/push', name: 'Push' }, day }));
  expect(task).not.toMatch(/class="[^"]*\bcontrol-primary\b/);
});
it('shows rest content, tomorrow preview and the food action without a workout primary', () => {
  const html = render(true, '2026-11-10');
  for (const text of ['يوم راحة', 'بكره', 'سجّل أكلك', 'العضل بيكبر وإنت مرتاح. نام كويس، واشرب ميه، وكُل أكلك.']) expect(html).toContain(text);
  expect(html).toContain('href="#home-day-preview"');
  expect(html).not.toContain('يلا نبدأ');
  expect(html).not.toContain('/player/rank');
  expect(html.match(/<a\b[^>]*class="[^"]*\bcontrol-primary\b[^"/]*"/g)).toHaveLength(1);
});
it('only promises streak preservation on a scheduled rest day', () => {
  expect(render(true, '2026-11-10')).toContain('الراحة مش هتقطع الـ1 يوم بتوعك');
  expect(render(true, '2026-11-11')).not.toContain('الراحة مش هتقطع');
});
it('does not link tomorrow when it is also rest', () => {
  const html = render(true, '2026-11-10', { ...snapshot, training_days: [1, 5] });
  expect(html).toContain('بكره كمان راحة');
  expect(html).not.toContain('href="#home-day-preview"');
});
it('keeps a skipped rotating workout for tomorrow after coach rest', () => {
  const html = render(true, '2026-11-10', { ...snapshot, training_days: [2, 3], days: [day,
    { ...day, id: 'pull', title: 'ضهر وبايسبس', position: 2 }] }, []);
  expect(html).toContain('صدر وترايسبس');
  expect(html).not.toContain('ضهر وبايسبس');
});
it('treats omitted weekly weekdays as rest without a preview link', () => {
  const html = render(true, '2026-11-10', { ...snapshot, settings: { repeatWeekly: true },
    days: [{ ...day, weekday: 3, is_rest_day: true }] });
  expect(html).toContain('بكره كمان راحة');
  expect(html).not.toContain('href="#home-day-preview"');
});
it('hides an empty captain row and lights the bell only for unheard notes', () => {
  expect(render()).not.toContain('رسالة صوتية');
  expect(render()).not.toContain('data-unheard');
  state.notes = [note];
  const unheard = render();
  expect(unheard).toContain('كابتن محمود');
  expect(unheard).toContain('رسالة صوتية · 0:24');
  expect(unheard).toContain('data-unheard');
  state.notes = [{ ...note, listenedAt: '2026-11-11T08:00:00Z' }];
  expect(render()).not.toContain('data-unheard');
  expect(render()).toContain('رسالة صوتية · 0:24');
});
it('keeps missing-plan and empty-workout contact actions secondary in v3', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const meals = state.meals;
  state.meals = [];
  try {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
      createElement('div', {}, createElement(NutritionSlot), createElement(TodayCard, { day: { ...day, exercises: [] }, rest: false }))));
    expect(html).toContain('/player/captain');
    expect(html).not.toMatch(/<a\b[^>]*class="[^"]*\bcontrol-primary\b/);
  } finally { state.meals = meals; }
});
it('selects the latest note while the bell also accounts for older unheard notes', () => {
  state.notes = [note, { ...note, id: 'new', createdAt: '2026-11-11T10:00:00Z', durationSeconds: 83, listenedAt: '2026-11-11T11:00:00Z' }];
  expect(render()).toContain('رسالة صوتية · 1:23');
  expect(render()).not.toContain('رسالة صوتية · 0:24');
  expect(render()).toContain('data-unheard');
});
it.each([[0, 2000, 0, 8], [1250, 2000, 5, 8], [249, 2125, 0, 9], [10000, 2000, 40, 8]])(
  'converts %i ml with %i ml goal into whole glasses', (ml, goal, done, planned) => {
    expect(waterGlasses(ml, goal)).toEqual({ done, planned });
  },
);

it('shows a done state instead of a second start once today’s workout is finished', () => {
  const todaySession: WorkoutSessionRow = { id: 'today', program_day_id: 'push', training_date: '2026-11-11',
    started_at: '2026-11-11T07:00:00Z', completed_at: '2026-11-11T08:00:00Z', client_updated_at: '2026-11-11T08:00:00Z' };
  const done = [...sessions, todaySession];
  const html = render(false, '2026-11-11', snapshot, done);
  expect(html).toContain('خلصت تمرين النهارده');
  expect(html).not.toContain('يلا نبدأ');
  expect(html).not.toContain('data-tour="workout-start"');
  const started = render(false, '2026-11-11', snapshot, [...sessions, { ...todaySession, completed_at: null }]);
  expect(started).toContain('يلا نبدأ');
});
