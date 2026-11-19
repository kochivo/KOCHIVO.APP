import 'server-only';
import { dayNutritionTargets, eatenMacros, eatenTotals, filterMeals, hasSplitMenu, mapNutritionSnapshot,
  nutritionTrainingDayCount } from '@/features/nutrition/server';
import type { NutritionFood } from '@/core/offline/db';
import type { MealLogRow } from '@/core/offline/tables';
import { macrosFor, sumMacros } from '@/lib/macros';
import type { ToolContext } from '../types';

type NutritionResponse = Parameters<typeof mapNutritionSnapshot>[0];

export async function playerNutritionPlan(ctx: ToolContext) {
  const { id, db } = ctx.actor;
  const food = 'name_ar,photo_path,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g';
  const result = await db.from('nutrition_plans')
    .select(`id,captain_id,title,water_target_ml,target_kcal,target_protein,target_carbs,target_fat,meals(id,position,name,day_type,time_of_day,meal_items(id,position,grams,unit,foods(${food},units),meal_item_alternatives(id,grams,foods(${food}))))`)
    .eq('player_id', id).eq('status', 'active').eq('is_template', false)
    .abortSignal(ctx.signal).returns<NutritionResponse[]>().maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) return null;
  const plan = mapNutritionSnapshot(result.data, id);
  if (ctx.client === 'ko' && hasSplitMenu(plan.meals)) {
    plan.training_day_count = await nutritionTrainingDayCount(db, id, result.data.captain_id, ctx);
  }
  return plan;
}

export async function playerMealLogs(ctx: ToolContext, today: string): Promise<MealLogRow[]> {
  const { id, db } = ctx.actor;
  const { data, error } = await db.from('meal_logs')
    .select('id,meal_id,log_date,swaps,completed_at,client_updated_at,deleted_at,eaten_macros')
    .eq('player_id', id).eq('log_date', today).is('deleted_at', null)
    .order('client_updated_at', { ascending: false }).order('id').abortSignal(ctx.signal);
  if (error) throw error;
  return data.map(row => ({
    ...row, eaten_macros: eatenMacros(row.eaten_macros),
    swaps: Object.fromEntries(Object.entries(row.swaps ?? {}).filter((pair): pair is [string, string] => typeof pair[1] === 'string')),
  }));
}

export function nutritionDay(plan: NonNullable<Awaited<ReturnType<typeof playerNutritionPlan>>>,
  logs: MealLogRow[], today: string, rest: boolean) {
  const meals = filterMeals(plan.meals, rest);
  const targets = dayNutritionTargets(plan, rest);
  const eaten = eatenTotals(plan, logs, today);
  const remaining = sumMacros([{
    kcal: Math.max(0, targets.kcal - eaten.kcal),
    protein: Math.max(0, targets.protein - eaten.protein),
    carbs: Math.max(0, targets.carbs - eaten.carbs),
    fat: Math.max(0, targets.fat - eaten.fat),
  }]);
  return { meals, targets, eaten, remaining };
}

export function foodPortion(food: NutritionFood) {
  const unit = food.units?.find(unit => unit.key === food.unit && unit.grams > 0);
  return {
    name: food.name,
    amount: unit ? Math.round(food.grams / unit.grams * 100) / 100 : food.grams,
    unit: unit?.key ?? 'g',
    grams: food.grams,
    ...macrosFor(food.per100g, food.grams),
  };
}
