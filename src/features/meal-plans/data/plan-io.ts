'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { ok, fail } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';
import { z } from 'zod';
import { uuidv7 } from '@/core/offline/ids';
import { planClient, toFood } from './client';
import type { PlanDraft, PlanSummary } from '../types';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { mealDayType } from './editor-fields';

const foodSchema = z.object({ id: z.uuid(), name: z.string(), photo: z.string().nullable(),
  kcal: z.number().nonnegative(), protein: z.number().nonnegative(), carbs: z.number().nonnegative(), fat: z.number().nonnegative() });
const alternative = z.object({ id: z.uuid(), food: foodSchema, grams: z.number().positive().max(99999.9) });
const draftSchema = z.object({
  id: z.uuid(), playerId: z.uuid().nullable(), title: z.string().trim().min(1).max(80),
  status: z.enum(['draft', 'active', 'archived']),
  targets: z.object({ kcal: z.number().int().min(800).max(8000), protein: z.number().int().min(0).max(32767),
    carbs: z.number().int().min(0).max(32767), fat: z.number().int().min(0).max(32767) }),
  meals: z.array(z.object({ id: z.uuid(), name: z.string().trim().min(1).max(40), position: z.number().int().positive(), dayType: z.enum(['all', 'training', 'rest']).optional(),
    items: z.array(alternative.extend({ grams: z.number().min(5).max(2000), position: z.number().int().positive(), alternatives: z.array(alternative).max(100) })).max(100),
  })).max(100),
});

export async function createPlan(playerId: string, title: string): Promise<ActionResult<string>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(playerId).success || !title.trim() || title.trim().length > 80) return fail(t('couldntCreateThePlanTryAgain'));
  title = title.trim();
  const client = await planClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return fail(t('signInFirst'));
  const id = uuidv7();
  const result = await client.from('nutrition_plans').insert({ id, player_id: playerId, captain_id: data.user.id, title });
  if (result.error) return fail(t('couldntCreateThePlanTryAgain'));
  return ok(id);
}
export async function listPlayerPlans(playerId: string): Promise<ActionResult<PlanSummary[]>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(playerId).success) return fail(t('couldntLoadPlansTryAgain'));
  const client = await planClient();
  const { data, error } = await client.from('nutrition_plans').select('*').eq('player_id', playerId).order('created_at', { ascending: false });
  if (error) return fail(t('couldntLoadPlansTryAgain'));
  return ok((data ?? []).map(({ id, title, status }) => ({ id, title, status })));
}
export async function loadPlan(id: string): Promise<ActionResult<PlanDraft>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) return fail(t('planNotFound'));
  const client = await planClient();
  const [{ data: plan, error }, user] = await Promise.all([
    client.from('nutrition_plans').select('*').eq('id', id).single(),
    client.auth.getClaims(),
  ]);
  if (error || !plan || user.error || plan.captain_id !== user.data?.claims.sub) return fail(t('planNotFound'));
  const meals = await client.from('meals').select('*').eq('plan_id', id).order('position');
  if (meals.error) return fail(t('couldntLoadMeals'));
  const mealIds = (meals.data ?? []).map(meal => meal.id);
  const items = mealIds.length ? await client.from('meal_items').select('*').in('meal_id', mealIds).order('position') : { data: [], error: null };
  if (items.error) return fail(t('couldntLoadFoods'));
  const itemIds = (items.data ?? []).map(item => item.id);
  const alts = itemIds.length ? await client.from('meal_item_alternatives').select('*').in('meal_item_id', itemIds) : { data: [], error: null };
  if (alts.error) return fail(t('couldntLoadAlternatives'));
  const foodIds = [...new Set([...(items.data ?? []), ...(alts.data ?? [])].map(item => item.food_id))];
  const foods = foodIds.length ? await client.from('foods').select('*').in('id', foodIds) : { data: [], error: null };
  if (foods.error) return fail(t('couldntLoadFoods'));
  const foodMap = new Map((foods.data ?? []).map(row => [row.id, toFood(row)]));
  if (foodIds.some(id => !foodMap.has(id))) return fail(t('foodUnavailableTryAgain'));
  function food(id: string) {
    const result = foodMap.get(id);
    if (!result) throw new Error('Missing validated food');
    return result;
  }
  return ok({ id, playerId: plan.player_id, title: plan.title, status: plan.status,
    targets: { kcal: plan.target_kcal ?? 2000, protein: plan.target_protein ?? 150, carbs: plan.target_carbs ?? 225, fat: plan.target_fat ?? 56 },
    meals: (meals.data ?? []).map((meal, index) => ({ id: meal.id, name: meal.name, position: index + 1,
      ...(captainWorkspaceEnabled() ? { dayType: mealDayType(meal) } : {}),
      items: (items.data ?? []).filter(item => item.meal_id === meal.id).map((item, index) => ({
        id: item.id, food: food(item.food_id), grams: Number(item.grams), position: index + 1,
        alternatives: (alts.data ?? []).filter(alt => alt.meal_item_id === item.id).map(alt => ({ id: alt.id, food: food(alt.food_id), grams: Number(alt.grams) })),
      })),
    })),
  });
}
export async function savePlan(input: PlanDraft): Promise<ActionResult<void>> {
  const t = await getT(messages);
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return fail(t('checkThePlanNameMealsTargetsAnd'));
  const draft = parsed.data;
  const client = await planClient();
  const args = { p_plan: draft.id, p_draft: draft,
    ...(captainWorkspaceEnabled() ? { p_day_types: draft.meals.map(meal => ({ id: meal.id, dayType: meal.dayType ?? 'all' })) } : {}) };
  const { error } = await client.rpc('save_nutrition_plan', args);
  if (error) return fail(t('couldntSaveTryAgain'));
  return ok(undefined);
}
