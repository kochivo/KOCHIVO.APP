import type { Macros } from '@/lib/macros';
import { z } from 'zod';

export interface FoodUnit { key: string; name_ar: string; name_en: string; grams: number }
export type DayType = 'all' | 'training' | 'rest';
export interface Food extends Macros { id: string; name: string; photo: string | null; custom: boolean; nameEn?: string | null; tags?: string[]; units?: FoodUnit[]; replacesId?: string | null }
export const customFoodSchema = z.object({
  name: z.string().trim().min(1).max(60),
  nameEn: z.string().trim().max(100).optional(),
  copyFrom: z.uuid().optional(),
  units: z.array(z.object({ key: z.string().min(1).max(80), name_ar: z.string().trim().min(1).max(60),
    name_en: z.string().trim().min(1).max(60), grams: z.number().positive().finite().max(10000) })).max(20).optional(),
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
export interface Meal { id: string; name: string; position: number; items: MealItem[]; dayType?: DayType; ramadanSlot?: 'iftar' | 'post_workout' | 'suhoor' | null }
export interface PlanDraft {
  id: string; playerId: string | null; title: string; status: 'draft' | 'active' | 'archived';
  targets: Macros; meals: Meal[]; waterTargetMl?: number | null;
}
export interface PlanSummary { id: string; title: string; status: string }

// Two layers: ilike treats \ % _ as special, then PostgREST unescapes \ and " inside the quoted value.
export function escapeSearch(query: string): string {
  return query.replace(/[\\%_]/g, character => `\\${character}`).replace(/[\\"]/g, character => `\\${character}`);
}
