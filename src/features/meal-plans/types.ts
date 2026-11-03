import type { Macros } from '@/lib/macros';
import { z } from 'zod';

export interface Food extends Macros { id: string; name: string; photo: string | null; custom: boolean }
export const customFoodSchema = z.object({
  name: z.string().trim().min(1).max(60),
  servingGrams: z.number().min(5).max(2000),
  kcal: z.number().min(0).max(5000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(1000),
  photoPath: z.string().min(1).max(200).optional(),
}).refine(value => value.kcal / value.servingGrams * 100 <= 900)
  // Macros are part of the serving's weight, so together they can never weigh more than the serving.
  .refine(value => value.protein + value.carbs + value.fat <= value.servingGrams);
export type CustomFoodInput = z.infer<typeof customFoodSchema>;
export interface Alternative { id: string; food: Food; grams: number }
export interface MealItem extends Alternative { position: number; alternatives: Alternative[] }
export interface Meal { id: string; name: string; position: number; items: MealItem[] }
export interface PlanDraft {
  id: string; playerId: string; title: string; status: 'draft' | 'active' | 'archived';
  targets: Macros; meals: Meal[];
}
export interface PlanSummary { id: string; title: string; status: string }

// Two layers: ilike treats \ % _ as special, then PostgREST unescapes \ and " inside the quoted value.
export function escapeSearch(query: string): string {
  return query.replace(/[\\%_]/g, character => `\\${character}`).replace(/[\\"]/g, character => `\\${character}`);
}
