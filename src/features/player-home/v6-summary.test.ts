import { expect, it } from 'vitest';
import { homeTiles, taskPresentation } from './v6-summary';
import { computeStreak } from './streak';

it('counts distinct completed training dates in the Saturday week', () => {
  expect(computeStreak({ today: '2026-11-12', accountStart: '2026-11-01',
    completedDates: ['2026-11-07', '2026-11-07', '2026-11-09', '2026-11-13'],
    isTrainingDay: date => ['2026-11-07', '2026-11-09', '2026-11-12'].includes(date),
  })).toMatchObject({ weekDone: 2, weekPlanned: 3 });
});

it('counts only today’s assigned, completed, nondeleted meals once', () => {
  const log = { id: 'l', meal_id: 'm', log_date: '2026-11-12', swaps: {},
    completed_at: '2026-11-12T10:00:00Z', client_updated_at: '2026-11-12T10:00:00Z', deleted_at: null };
  expect(homeTiles([{ id: 'm' }, { id: 'n' }], [log, { ...log, id: 'duplicate' },
    { ...log, meal_id: 'n', deleted_at: log.completed_at }, { ...log, meal_id: 'old' }], '2026-11-12', 1500, 3000))
    .toEqual({ mealsDone: 1, mealsTotal: 2, waterLitres: 1.5, goalLitres: 3 });
  expect(homeTiles([], [log], '2026-11-13', 0, 3000).mealsDone).toBe(0);
});

it('gives each next-task kind its own action without making waiting actionable', () => {
  expect(taskPresentation({ kind: 'start', name: 'Push', href: '/player/workout/d' }))
    .toEqual({ heading: 'v6WorkoutToday', action: 'startWorkout', workout: true });
  expect(taskPresentation({ kind: 'continue' }).action).toBe('v6Continue');
  expect(taskPresentation({ kind: 'meal' }).action).toBe('v6LogMeal');
  expect(taskPresentation({ kind: 'checkin' }).action).toBe('v6Answer');
  expect(taskPresentation({ kind: 'waiting' }).action).toBeNull();
  expect(taskPresentation({ kind: 'done' }).action).toBeNull();
});
