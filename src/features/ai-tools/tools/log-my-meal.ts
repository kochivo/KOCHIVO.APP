import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { filterMeals, mealMacros } from '@/features/nutrition/server';
import { localDate } from '@/lib/dates';
import type { AppDatabase } from '@/types/app-database';
import { nutritionDay, playerMealLogs, playerNutritionPlan } from '../data/player-nutrition';
import { playerWorkout } from '../data/player-workout';
import { defineTool } from '../define-tool';
import { ToolError } from '../tool-error';
import type { MealWriteArgs } from '../types';
import { macroSchema } from './get-my-nutrition-today';

type MealDatabase = {
  public: Omit<AppDatabase['public'], 'Functions'> & {
    Functions: AppDatabase['public']['Functions'] & {
      ai_log_meal: {
        Args: MealWriteArgs;
        Returns: undefined;
      };
    };
  };
};

export const logMyMeal = defineTool({
  name: 'log_my_meal',
  description: "Mark a plan meal eaten or uneaten for today, only when the player asks. Optional swaps must use the plan's alternative IDs.",
  input: z.strictObject({
    mealId: z.uuid(), eaten: z.boolean().default(true), swaps: z.record(z.uuid(), z.uuid()).optional(),
  }),
  output: z.union([z.object({ eaten: macroSchema, remaining: macroSchema }), z.object({ replayed: z.literal(true) })]),
  roles: ['player'],
  kind: 'write',
  async run(ctx, input) {
    const today = localDate(ctx.now, ctx.timezone);
    const plan = await playerNutritionPlan(ctx);
    const meal = plan?.meals.find(row => row.id === input.mealId.toLowerCase());
    if (!plan || !meal) throw new ToolError('not_found');
    const previous = input.swaps === undefined ? await playerMealLogs(ctx, today) : [];
    const requested = input.swaps ?? previous.find(row => row.meal_id === meal.id)?.swaps ?? {};
    const swaps: Record<string, string> = {};
    for (const [key, value] of Object.entries(requested)) {
      const item = key.toLowerCase();
      const alt = value.toLowerCase();
      if (meal.items.find(row => row.id === item)?.alternatives.some(option => option.id === alt)) {
        swaps[item] = alt;
      } else if (input.swaps) {
        throw new ToolError('invalid_input');
      }
    }

    const workout = await playerWorkout(ctx, today);
    if (ctx.client === 'ko' && !filterMeals([meal], workout?.rest ?? false).length) throw new ToolError('not_found');
    // Migration 0156 adds the RPC to the same caller-scoped database.
    const db = ctx.actor.db as unknown as SupabaseClient<MealDatabase>;
    const args = {
      p_meal_id: meal.id, p_log_date: today, p_swaps: swaps,
      p_eaten: input.eaten, p_eaten_macros: input.eaten ? mealMacros(meal, swaps) : null,
    };
    const result = ctx.confirmMeal
      ? await ctx.confirmMeal(args, ctx.signal)
      : await db.rpc('ai_log_meal', args).abortSignal(ctx.signal);
    const { error } = result;
    if (error?.code === '42501') throw new ToolError('forbidden');
    if (error?.code === '22023') throw new ToolError('invalid_input');
    if (error) throw error;
    if (result.data === false) return { replayed: true as const };
    const logs = await playerMealLogs(ctx, today);
    const { eaten, remaining } = nutritionDay(plan, logs, today, workout?.rest ?? false);
    return { eaten, remaining };
  },
});
