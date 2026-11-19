'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { ok, fail } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';
import { z } from 'zod';
import { uuidv7 } from '@/core/offline/ids';
import { planTargets } from '@/lib/day-targets';
import { planClient, toFood } from './client';
import type { PlanDraft, PlanSummary } from '../types';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { mealDayType } from './editor-fields';
import { draftSchema } from './plan-schema';
import { portionPayload, portionsChanged } from './portion-payload';

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
    waterTargetMl: z.object({ water_target_ml: z.number().nullable().optional() }).parse(plan).water_target_ml ?? null,
    targets: planTargets({ kcal: plan.target_kcal, protein: plan.target_protein, carbs: plan.target_carbs, fat: plan.target_fat }),
    meals: (meals.data ?? []).map((meal, index) => ({ id: meal.id, name: meal.name, position: index + 1,
      ramadanSlot: z.object({ ramadan_slot: z.enum(['iftar','post_workout','suhoor']).nullable().optional() }).parse(meal).ramadan_slot ?? null,
      ...(captainWorkspaceEnabled() ? { dayType: mealDayType(meal), timeOfDay: (meal as typeof meal & { time_of_day?: string | null }).time_of_day ?? null } : {}),
      items: (items.data ?? []).filter(item => item.meal_id === meal.id).map((item, index) => ({
        id: item.id, food: food(item.food_id), grams: Number(item.grams), position: index + 1,
        ...(captainWorkspaceEnabled() ? { unit: (item as typeof item & { unit?: string | null }).unit ?? null } : {}),
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
  let savePortions = false;
  if (captainWorkspaceEnabled() && input.meals.some(meal => 'timeOfDay' in meal || meal.items.some(item => 'unit' in item))) {
    const storedMeals = await client.from('meals').select('*').eq('plan_id', draft.id);
    if (storedMeals.error) return fail(t('couldntSaveTryAgain'));
    const ids = (storedMeals.data ?? []).map(meal => meal.id);
    const storedItems = ids.length ? await client.from('meal_items').select('*').in('meal_id', ids) : { data: [], error: null };
    if (storedItems.error) return fail(t('couldntSaveTryAgain'));
    savePortions = portionsChanged(draft, storedMeals.data ?? [], storedItems.data ?? []);
  }
  const args = { p_plan: draft.id, p_draft: draft,
    ...(captainWorkspaceEnabled() ? { p_day_types: draft.meals.map(meal => ({ id: meal.id, dayType: meal.dayType ?? 'all' })) } : {}),
    ...(savePortions ? { p_portions: portionPayload(draft) } : {}),
  };
  const { error } = await client.rpc('save_nutrition_plan', args);
  if (error) return fail(t('couldntSaveTryAgain'));
  return ok(undefined);
}
