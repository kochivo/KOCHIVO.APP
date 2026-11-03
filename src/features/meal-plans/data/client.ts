import 'server-only';
import type { Tables } from '@/types/database';
export { supabaseServer as planClient } from '@/core/supabase/server';

export type FoodRow = Pick<Tables<'foods'>, 'id' | 'name_ar' | 'name_en' | 'photo_path' |
  'kcal_per_100g' | 'protein_per_100g' | 'carbs_per_100g' | 'fat_per_100g'>;
export type PlanRow = Pick<Tables<'nutrition_plans'>, 'id' | 'captain_id' | 'player_id' | 'title' |
  'status' | 'target_kcal' | 'target_protein' | 'target_carbs' | 'target_fat'>;
export function toFood(row: FoodRow) {
  return { id: row.id, name: row.name_ar, photo: row.photo_path, kcal: Number(row.kcal_per_100g),
    protein: Number(row.protein_per_100g), carbs: Number(row.carbs_per_100g), fat: Number(row.fat_per_100g) };
}
