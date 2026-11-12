import type { MealLogRow } from '@/core/offline';
import type { PlayerTask } from './next-task';

export function homeTiles(meals: readonly { id: string }[], logs: readonly MealLogRow[], today: string, waterMl: number, goalMl: number) {
  return { mealsDone: meals.filter(meal => logs.some(log => log.meal_id === meal.id &&
    log.log_date === today && log.completed_at && !log.deleted_at)).length,
  mealsTotal: meals.length, waterLitres: waterMl / 1000, goalLitres: goalMl / 1000 };
}

export function taskPresentation(task: PlayerTask) {
  const workout = task.kind === 'start' || task.kind === 'continue';
  const action = task.kind === 'start' ? 'startWorkout' : task.kind === 'continue' ? 'v6Continue' :
    task.kind === 'meal' ? 'v6LogMeal' : task.kind === 'checkin' ? 'v6Answer' :
    task.kind === 'waiting' || task.kind === 'done' ? null : 'taskAction';
  return { heading: workout ? 'v6WorkoutToday' : `task.${task.kind}` as const, action, workout } as const;
}
