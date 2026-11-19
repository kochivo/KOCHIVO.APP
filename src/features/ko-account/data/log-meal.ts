import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlayerTimezone } from '@/core/timezone/server';
import { uuidv7 } from '@/core/offline/ids';
import { playerNutritionPlan, playerWorkout } from '@/features/ai-tools/server';
import { filterMeals } from '@/features/nutrition/server';
import { localDate } from '@/lib/dates';
import type { AppDatabase } from '@/types/app-database';
import type { KoActor } from './account';
import { matchNamed } from './match';

type ToolContext = Parameters<typeof playerNutritionPlan>[0];
type ConfirmMeal = NonNullable<ToolContext['confirmMeal']>;
type MealApprovalDatabase = {
  public: Omit<AppDatabase['public'], 'Functions'> & {
    Functions: AppDatabase['public']['Functions'] & {
      ko_confirm_meal: { Args: Parameters<ConfirmMeal>[0] & { p_token: string }; Returns: boolean };
    };
  };
};

export function confirmMealApproval(actor: KoActor, token: string): ConfirmMeal {
  const db = actor.db as unknown as SupabaseClient<MealApprovalDatabase>;
  return (args, signal) => db.rpc('ko_confirm_meal', { ...args, p_token: token }).abortSignal(signal);
}

export async function mealToolContext(actor: KoActor, now: number, signal: AbortSignal): Promise<ToolContext> {
  return { actor, now: new Date(now), signal, client: 'ko', correlationId: uuidv7(now),
    timezone: await getPlayerTimezone(actor.id) };
}

export async function matchPlanMeal(ctx: ToolContext, name: string) {
  const plan = await playerNutritionPlan(ctx);
  if (!plan) return { names: [] };
  const today = localDate(ctx.now, ctx.timezone);
  const workout = await playerWorkout(ctx, today);
  const meals = filterMeals(plan.meals, workout?.rest ?? false);
  const matches = matchNamed(meals.map(meal => ({ ...meal, name_ar: meal.name, name_en: null })), name);
  return { meal: matches.length === 1 ? matches[0] : undefined, names: meals.map(meal => meal.name) };
}
