import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
const t = createT(messages, 'ar');

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NutritionFood, NutritionSnapshot } from '@/core/offline';
import type { Tables } from '@/types/database';
import type { AppDatabase as Database } from '@/types/app-database';
import { loadPlayerFile } from '@/features/player-file';
import { hasSplitMenu } from '../day-type-filter';

type FoodResponse = Pick<Tables<'foods'>, 'name_ar' | 'photo_path' |
  'kcal_per_100g' | 'protein_per_100g' | 'carbs_per_100g' | 'fat_per_100g'> & { units?: NutritionFood['units'] };
type AlternativeResponse = Pick<Tables<'meal_item_alternatives'>, 'id' | 'grams'> & { foods: FoodResponse | null };
export type NutritionResponse = Pick<Tables<'nutrition_plans'>,
  'id' | 'title' | 'target_kcal' | 'target_protein' | 'target_carbs' | 'target_fat'> & {
  captain_id?: string;
  water_target_ml?: number | null;
  meals: (Pick<Tables<'meals'>, 'id' | 'position' | 'name'> & {
    day_type?: 'all' | 'training' | 'rest'; time_of_day?: string | null; ramadan_slot?: 'iftar' | 'post_workout' | 'suhoor' | null;
    meal_items: (AlternativeResponse & Pick<Tables<'meal_items'>, 'position'> & {
      unit?: string | null;
      meal_item_alternatives: AlternativeResponse[];
    })[];
  })[];
};

function mapFood(row: AlternativeResponse): NutritionFood {
  if (!row.foods) throw new Error(t('foodDataIsMissing'));
  return { name: row.foods.name_ar, grams: row.grams, photo_path: row.foods.photo_path, units: row.foods.units,
    per100g: { kcal: row.foods.kcal_per_100g, protein: row.foods.protein_per_100g,
      carbs: row.foods.carbs_per_100g, fat: row.foods.fat_per_100g } };
}

export function mapNutritionSnapshot(plan: NutritionResponse, playerId: string): NutritionSnapshot {
  return { id: 'active', player_id: playerId, plan_id: plan.id, title: plan.title,
    water_target_ml: plan.water_target_ml ?? null,
    targets: { kcal: plan.target_kcal, protein: plan.target_protein, carbs: plan.target_carbs, fat: plan.target_fat },
    meals: [...plan.meals].sort((a, b) => a.position - b.position).map((meal) => ({
      id: meal.id, name: meal.name, position: meal.position,
      day_type: meal.day_type ?? 'all', time_of_day: meal.time_of_day ?? null,
      ramadan_slot: meal.ramadan_slot ?? null,
      items: [...meal.meal_items].sort((a, b) => a.position - b.position).map((item) => ({
        ...mapFood(item), id: item.id, position: item.position, unit: item.unit ?? null,
        alternatives: item.meal_item_alternatives.map((alt) => ({ ...mapFood(alt), id: alt.id })),
      })),
    })),
  };
}
export async function nutritionTrainingDayCount(client: SupabaseClient<Database>, playerId: string,
  formCaptainId: string | undefined, options: { now: Date; timezone?: string }): Promise<number> {
  const { facts } = await loadPlayerFile(client, playerId, { ...options, formCaptainId, checkinLimit: 0 });
  return facts.trainingDays?.value.length ?? 0;
}

export async function fetchNutritionSnapshot(client: SupabaseClient<Database>, now = new Date()): Promise<NutritionSnapshot | null> {
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) throw error ?? new Error('Missing session');
  const foodFields = 'name_ar,photo_path,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g';
  const read = (extended: boolean) => {
    const columns: string = `id,captain_id,title,water_target_ml,target_kcal,target_protein,target_carbs,target_fat,meals(id,position,name,${extended ? 'day_type,time_of_day,ramadan_slot,' : ''}meal_items(id,position,grams,${extended ? 'unit,' : ''}foods(${foodFields}${extended ? ',units' : ''}),meal_item_alternatives(id,grams,foods(${foodFields}))))`;
    return client.from('nutrition_plans').select(columns)
      .eq('player_id', auth.user.id).eq('status', 'active').maybeSingle();
  };
  let result = await read(true);
  if (result.error?.code === '42703') result = await read(false);
  const { data, error: readError } = result;
  if (readError) throw readError;
  // The generated schema predates the portion columns selected above.
  if (!data) return null;
  const plan = data as unknown as NutritionResponse;
  const snapshot = mapNutritionSnapshot(plan, auth.user.id);
  if (hasSplitMenu(snapshot.meals)) {
    snapshot.training_day_count = await nutritionTrainingDayCount(client, auth.user.id, plan.captain_id, { now });
  }
  return snapshot;
}
