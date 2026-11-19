import 'server-only';
import { nutritionDay, playerMealLogs, playerNutritionPlan, playerWorkout } from '@/features/ai-tools/server';
import { isRestDay } from '@/features/player-home/server';
import { fetchPlayerPreview } from '@/features/player-preview';
import { localDate } from '@/lib/dates';
import type { createT } from '@/core/i18n/messages';
import type { messages } from '../messages';
import type { KoActor } from './account';
import { mealToolContext } from './log-meal';
import { readProgress } from './read-progress';

export const quickKeys = ['quickWorkout', 'quickMeals', 'quickProgress'] as const;

export async function readQuick(actor: KoActor, key: typeof quickKeys[number], locale: 'ar' | 'en', now: number,
  signal: AbortSignal, t: ReturnType<typeof createT<typeof messages>>, player?: { id: string; name: string }) {
  if (key === 'quickProgress') {
    const kind = actor.role === 'player' ? 'my_progress' : player ? 'player_summary' : 'team_summary';
    return readProgress(actor, { kind, args: {} }, locale, now, player);
  }
  if (actor.role === 'captain' && !player) return t('quickPlayerOnly');
  const ctx = await mealToolContext(player ? { ...actor, id: player.id } : actor, now, signal);
  const day = localDate(ctx.now, ctx.timezone);
  const workout = player ? await captainWorkout(player.id, day) : await playerWorkout(ctx, day);
  if (key === 'quickWorkout') {
    if (workout?.rest || !workout?.day?.exercises.length) return t('quickWorkoutEmpty');
    return [workout.day.title, ...workout.day.exercises.map(row => t('quickExercise', {
      name: (locale === 'ar' ? row.name_ar || row.name_en : row.name_en || row.name_ar) ?? '', sets: row.sets,
    }))].filter(Boolean).join('\n');
  }
  const plan = await playerNutritionPlan(ctx);
  if (!plan) return t('quickMealsEmpty');
  const logs = await playerMealLogs(ctx, day);
  const { meals } = nutritionDay(plan, logs, day, workout?.rest ?? false);
  return meals.map(meal => meal.name).join('\n') || t('quickMealsEmpty');
}

async function captainWorkout(playerId: string, today: string) {
  const result = await fetchPlayerPreview(playerId, today);
  if (result.error) throw new Error(result.error);
  const preview = result.data;
  if (!preview?.program) return null;
  return {
    day: preview.todayDay,
    rest: isRestDay(preview.program, preview.sessions, today) || Boolean(preview.todayDay?.is_rest_day),
  };
}
