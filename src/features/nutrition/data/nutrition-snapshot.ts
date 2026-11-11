import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
const t = createT(messages, 'ar');

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NutritionFood, NutritionSnapshot } from '@/core/offline';
import type { Tables } from '@/types/database';
import type { AppDatabase as Database } from '@/types/app-database';

type FoodResponse = Pick<Tables<'foods'>, 'name_ar' | 'photo_path' |
  'kcal_per_100g' | 'protein_per_100g' | 'carbs_per_100g' | 'fat_per_100g'>;
type AlternativeResponse = Pick<Tables<'meal_item_alternatives'>, 'id' | 'grams'> & { foods: FoodResponse | null };
export type NutritionResponse = Pick<Tables<'nutrition_plans'>,
  'id' | 'title' | 'target_kcal' | 'target_protein' | 'target_carbs' | 'target_fat'> & {
  meals: (Pick<Tables<'meals'>, 'id' | 'position' | 'name'> & {
    meal_items: (AlternativeResponse & Pick<Tables<'meal_items'>, 'position'> & {
      meal_item_alternatives: AlternativeResponse[];
    })[];
  })[];
};

function mapFood(row: AlternativeResponse): NutritionFood {
  if (!row.foods) throw new Error(t('foodDataIsMissing'));
  return { name: row.foods.name_ar, grams: row.grams, photo_path: row.foods.photo_path,
    per100g: { kcal: row.foods.kcal_per_100g, protein: row.foods.protein_per_100g,
      carbs: row.foods.carbs_per_100g, fat: row.foods.fat_per_100g } };
}

export function mapNutritionSnapshot(plan: NutritionResponse, playerId: string): NutritionSnapshot {
  return { id: 'active', player_id: playerId, plan_id: plan.id, title: plan.title,
    targets: { kcal: plan.target_kcal, protein: plan.target_protein, carbs: plan.target_carbs, fat: plan.target_fat },
    meals: [...plan.meals].sort((a, b) => a.position - b.position).map((meal) => ({
      id: meal.id, name: meal.name, position: meal.position,
      items: [...meal.meal_items].sort((a, b) => a.position - b.position).map((item) => ({
        ...mapFood(item), id: item.id, position: item.position,
        alternatives: item.meal_item_alternatives.map((alt) => ({ ...mapFood(alt), id: alt.id })),
      })),
    })),
  };
}
export async function fetchNutritionSnapshot(client: SupabaseClient<Database>): Promise<NutritionSnapshot | null> {
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) throw error ?? new Error('Missing session');
  const foodFields = 'name_ar,photo_path,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g';
  const { data, error: readError } = await client.from('nutrition_plans')
    .select(`id,title,target_kcal,target_protein,target_carbs,target_fat,meals(id,position,name,meal_items(id,position,grams,foods(${foodFields}),meal_item_alternatives(id,grams,foods(${foodFields}))))`)
    .eq('player_id', auth.user.id).eq('status', 'active').maybeSingle();
  if (readError) throw readError;
  return data ? mapNutritionSnapshot(data, auth.user.id) : null;
}
