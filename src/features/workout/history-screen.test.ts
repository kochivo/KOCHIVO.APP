import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { HistoryScreen } from './components/history-screen';
import type { HistoryWorkout } from './data/history-grouping';

const state = vi.hoisted(() => ({ workouts: [] as HistoryWorkout[], loading: false, error: false, hasMore: false,
  names: [{ id: 'exercise', name_ar: 'سكوات', name_en: 'Squat' }], days: [{ id: 'day', title: 'Legs' }], retry() {} }));
vi.mock('./hooks/use-workout-history', () => ({ useWorkoutHistory: () => state }));
const render = (exerciseId?: string) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
  createElement(HistoryScreen, { playerId: 'player', exerciseId })));
beforeEach(() => { state.workouts = []; state.loading = false; state.error = false; });

it('shows loading, a retryable error, and a useful empty state', () => {
  state.loading = true;
  expect(render()).toContain('role="status"');
  state.loading = false; state.error = true;
  expect(render()).toContain('Try again');
  state.error = false;
  const html = render();
  expect(html).toContain("You haven&#x27;t finished a workout yet");
  expect(html).toContain('href="/player"');
});

it('preselects an exercise, shows its best set and renders bodyweight sets', () => {
  const set = { id: 'set', session_id: 'session', program_exercise_id: 'item', exercise_id: 'exercise', set_index: 1,
    weight_kg: 0, reps: 10, completed_at: '2026-11-04', client_updated_at: '2026-11-04', deleted_at: null };
  state.workouts = [{ id: 'session', program_day_id: 'day', training_date: '2026-11-04', started_at: '2026-11-04',
    completed_at: '2026-11-04', client_updated_at: '2026-11-04', setCount: 1, exercises: [{ id: 'exercise', sets: [set] }] }];
  const html = render('exercise');
  expect(html).toContain('value="exercise" selected=""');
  expect(html).toContain('Best set');
  expect(html).toContain('Squat');
  expect(html).toContain('Bodyweight × 10');
  expect(html).toContain('Legs');
});

it('renders only twenty workouts before showing the next page action', () => {
  state.workouts = Array.from({ length: 21 }, (_, index) => ({ id: String(index), program_day_id: 'day',
    training_date: '2026-11-04', started_at: '2026-11-04', completed_at: '2026-11-04', client_updated_at: '2026-11-04',
    setCount: 0, exercises: [] }));
  const html = render();
  expect(html.match(/<details/g)).toHaveLength(20);
  expect(html).toContain('Show more');
});
