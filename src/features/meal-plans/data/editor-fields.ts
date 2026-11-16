import { z } from 'zod';

export const foodUnitSchema = z.object({ key: z.string(), name_ar: z.string(), name_en: z.string(), grams: z.number().positive().finite() });
// Validate new JSON/columns at the boundary while the generated schema awaits regeneration.
export function foodFields(row: unknown) {
  const parsed = z.object({ name_en: z.string().nullable().optional(), tags: z.array(z.string()).optional(),
    units: z.array(foodUnitSchema).optional(), replaces_id: z.string().nullable().optional() }).safeParse(row);
  const source = z.object({ region: z.enum(['eg', 'gulf', 'lev', 'na', 'intl']).optional(),
    state: z.enum(['raw', 'cooked']).nullable().optional(),
    diet_tags: z.array(z.enum(['meat', 'poultry', 'fish', 'dairy', 'egg', 'plant'])).optional(),
    fiber_per_100g: z.coerce.number().nullable().optional(), sugar_per_100g: z.coerce.number().nullable().optional(),
    sodium_mg_per_100g: z.coerce.number().nullable().optional(), source_kind: z.enum(['usda', 'recipe', 'proxy']).nullable().optional(),
    source_ref: z.union([z.object({ fdc_id: z.string(), dataset: z.string(), description: z.string() }),
      z.object({ ingredients: z.array(z.object({ food_id: z.string().optional(), fdc_id: z.string(), grams: z.number(), description: z.string(),
        diet_tags: z.array(z.enum(['meat', 'poultry', 'fish', 'dairy', 'egg', 'plant'])) })), cooked_yield_g: z.number() })]).nullable().optional(),
  }).safeParse(row);
  return parsed.success ? { ...(source.success ? source.data : {}), nameEn: parsed.data.name_en, tags: parsed.data.tags, units: parsed.data.units,
    ...(parsed.data.replaces_id ? { replacesId: parsed.data.replaces_id } : {}) } : {};
}
export function mealDayType(row: unknown) {
  const parsed = z.object({ day_type: z.enum(['all', 'training', 'rest']) }).safeParse(row);
  return parsed.success ? parsed.data.day_type : 'all';
}
