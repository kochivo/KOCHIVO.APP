import { getPlayerTimezone } from '@/core/timezone/server';
import { uuidv7 } from '@/core/offline/ids';
import { nutritionDay, playerMealLogs, playerNutritionPlan, playerWorkout } from '@/features/ai-tools/server';
import { localDate } from '@/lib/dates';
import type { KoActor } from './account';
import { matchNamed } from './match';

type ToolContext = Parameters<typeof playerNutritionPlan>[0];

export async function mealToolContext(actor: KoActor, now: number, signal: AbortSignal): Promise<ToolContext> {
  return { actor, now: new Date(now), signal, client: 'ko', correlationId: uuidv7(now),
    timezone: await getPlayerTimezone(actor.id) };
}

export async function matchPlanMeal(ctx: ToolContext, name: string) {
  const plan = await playerNutritionPlan(ctx);
  if (!plan) return { names: [] };
  const today = localDate(ctx.now, ctx.timezone);
  const [logs, workout] = await Promise.all([playerMealLogs(ctx, today), playerWorkout(ctx, today)]);
  const { meals } = nutritionDay(plan, logs, today, workout?.rest ?? false);
  const matches = matchNamed(meals.map(meal => ({ ...meal, name_ar: meal.name, name_en: null })), name);
  return { meal: matches.length === 1 ? matches[0] : undefined, names: meals.map(meal => meal.name) };
}
