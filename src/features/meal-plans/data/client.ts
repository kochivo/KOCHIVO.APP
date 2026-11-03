import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';

export type FoodRow = {
  id: string; name_ar: string; name_en: string | null; photo_path: string | null;
  kcal_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number;
}
export type PlanRow = {
  id: string; captain_id: string; player_id: string | null; title: string;
  status: 'draft' | 'active' | 'archived'; target_kcal: number | null;
  target_protein: number | null; target_carbs: number | null; target_fat: number | null;
}
type Table<T, I = never> = { Row: T; Insert: I; Update: never; Relationships: [] };
type Schema = { public: {
  Tables: {
    foods: Table<FoodRow>;
    nutrition_plans: Table<PlanRow, { id: string; captain_id: string; player_id: string; title: string }>;
    meals: Table<{ id: string; plan_id: string; name: string; position: number }>;
    meal_items: Table<{ id: string; meal_id: string; food_id: string; grams: number; position: number }>;
    meal_item_alternatives: Table<{ id: string; meal_item_id: string; food_id: string; grams: number }>;
  };
  Views: Record<string, never>;
  Functions: {
    activate_nutrition_plan: { Args: { p_plan: string }; Returns: undefined };
    save_nutrition_plan: { Args: { p_plan: string; p_draft: unknown }; Returns: undefined };
  };
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };
export async function planClient() {
  // Feature-local schema follows the roster until shared generated types replace the placeholder.
  return await supabaseServer() as unknown as SupabaseClient<Schema>;
}
export function toFood(row: FoodRow) {
  return { id: row.id, name: row.name_ar, photo: row.photo_path, kcal: Number(row.kcal_per_100g),
    protein: Number(row.protein_per_100g), carbs: Number(row.carbs_per_100g), fat: Number(row.fat_per_100g) };
}
