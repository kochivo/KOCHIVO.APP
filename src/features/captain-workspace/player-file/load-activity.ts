import 'server-only';
import { supabaseServer } from '@/core/supabase/server';
import { eatenMacros, filterMeals, mapNutritionSnapshot, mealMacros, targetsOf } from '@/features/nutrition/server';
import type { NutritionResponse } from '@/features/nutrition';
import { sumMacros } from '@/lib/macros';
import { loadMealDay } from './load-meal-day';

export async function loadActivity(playerId: string, today: string) {
  const client = await supabaseServer();
  const foodFields = 'name_ar,photo_path,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g';
  const [session, plan, logs, scans, rest] = await Promise.all([
    client.from('workout_sessions').select('id,training_date,session_rpe,program_days(title)')
      .eq('player_id', playerId).not('completed_at', 'is', null).lte('training_date', today)
      .order('training_date', { ascending: false }).order('started_at', { ascending: false }).limit(1).maybeSingle(),
    client.from('nutrition_plans').select(`id,title,target_kcal,target_protein,target_carbs,target_fat,meals(id,position,name,day_type,meal_items(id,position,grams,foods(${foodFields}),meal_item_alternatives(id,grams,foods(${foodFields}))))`)
      .eq('player_id', playerId).eq('status', 'active').maybeSingle().returns<NutritionResponse | null>(),
    client.from('meal_logs').select('*').eq('player_id', playerId).eq('log_date', today).is('deleted_at', null),
    client.from('body_scans').select('scan_date,weight_kg,fat_pct').eq('player_id', playerId)
      .lte('scan_date', today).order('scan_date', { ascending: false }).limit(26),
    loadMealDay(client, playerId, today),
  ]);
  if (session.error || plan.error || logs.error || scans.error) throw session.error ?? plan.error ?? logs.error ?? scans.error;
  const sets = session.data ? await client.from('set_logs').select('exercise_id,program_exercise_id,set_index,drop_index,reps,weight_kg,exercises(name_ar,name_en,media_path)')
    .eq('player_id', playerId).eq('session_id', session.data.id).is('deleted_at', null).order('set_index') : null;
  if (sets?.error) throw sets.error;
  const snapshot = plan.data ? mapNutritionSnapshot(plan.data, playerId) : null;
  if (snapshot) snapshot.meals = filterMeals(snapshot.meals, rest, logs.data.flatMap(row => row.meal_id ? [{ ...row,
    meal_id: row.meal_id, swaps: {}, eaten_macros: eatenMacros(row.eaten_macros) }] : []), today);
  const meals = snapshot?.meals.map(meal => {
    const log = logs.data.find(row => row.meal_id === meal.id);
    const swaps = Object.fromEntries(Object.entries(log?.swaps ?? {}).filter((pair): pair is [string, string] => typeof pair[1] === 'string'));
    return { id: meal.id, name: meal.name, items: meal.items.map(item => {
      const food = item.alternatives.find(alt => alt.id === swaps[item.id]) ?? item;
      return { name: food.name, grams: food.grams };
    }), macros: log?.completed_at ? eatenMacros(log.eaten_macros) ?? mealMacros(meal, swaps) : mealMacros(meal, swaps), logged: Boolean(log?.completed_at) };
  }) ?? [];
  return { scans: scans.data, last: session.data, sets: sets?.data ?? [], nutrition: snapshot ? {
    title: snapshot.title, meals, targets: targetsOf(snapshot), eaten: sumMacros(meals.filter(meal => meal.logged).map(meal => meal.macros)),
  } : null };
}
export type FileActivity = Awaited<ReturnType<typeof loadActivity>>;
