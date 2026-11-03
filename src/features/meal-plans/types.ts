import type { Macros } from '@/lib/macros';

export interface Food extends Macros { id: string; name: string; photo: string | null }
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
