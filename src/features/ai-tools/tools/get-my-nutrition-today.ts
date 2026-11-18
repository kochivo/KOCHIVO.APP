import 'server-only';
import { z } from 'zod';
import { localDate } from '@/lib/dates';
import { foodPortion, nutritionDay, playerMealLogs, playerNutritionPlan } from '../data/player-nutrition';
import { playerWorkout } from '../data/player-workout';
import { defineTool } from '../define-tool';

export const macroSchema = z.object({ kcal: z.number(), protein: z.number(), carbs: z.number(), fat: z.number() });
const portion = macroSchema.extend({ name: z.string(), amount: z.number(), unit: z.string(), grams: z.number() });
const meal = z.object({
  id: z.uuid(), name: z.string(), time: z.string().nullable(),
  items: z.array(portion.extend({ id: z.uuid(), alternatives: z.array(portion.extend({ id: z.uuid() })) })),
  eaten: z.boolean(), swaps: z.record(z.string(), z.string()),
});

export const getMyNutritionToday = defineTool({
  name: 'get_my_nutrition_today',
  description: "Read today's meals, portions, allowed swaps, and nutrition totals from your active plan.",
  input: z.strictObject({}),
  output: z.object({
    title: z.string(), dayType: z.enum(['rest', 'training']),
    targets: macroSchema.extend({ waterMl: z.number().optional() }),
    meals: meal.array(), eaten: macroSchema, remaining: macroSchema,
  }).nullable(),
  roles: ['player'],
  kind: 'read',
  async run(ctx) {
    const today = localDate(ctx.now, ctx.timezone);
    const plan = await playerNutritionPlan(ctx);
    if (!plan) return null;
    const [logs, workout] = await Promise.all([playerMealLogs(ctx, today), playerWorkout(ctx, today)]);
    const rest = workout?.rest ?? false;
    const { meals, targets, eaten, remaining } = nutritionDay(plan, logs, today, rest);
    return {
      title: plan.title, dayType: rest ? 'rest' : 'training',
      targets: { ...targets, ...(plan.water_target_ml == null ? {} : { waterMl: plan.water_target_ml }) },
      meals: meals.map(row => {
        const log = logs.find(entry => entry.meal_id === row.id);
        return {
          id: row.id, name: row.name, time: row.time_of_day ?? null,
          items: row.items.map(item => ({
            ...foodPortion(item), id: item.id,
            alternatives: item.alternatives.map(alt => ({ ...foodPortion(alt), id: alt.id })),
          })),
          eaten: Boolean(log?.completed_at), swaps: log?.swaps ?? {},
        };
      }),
      eaten, remaining,
    };
  },
});
