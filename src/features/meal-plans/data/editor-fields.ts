import { z } from 'zod';

export const foodUnitSchema = z.object({ key: z.string(), name_ar: z.string(), name_en: z.string(), grams: z.number().positive().finite() });
// Validate new JSON/columns at the boundary while the generated schema awaits regeneration.
export function foodFields(row: unknown) {
  const parsed = z.object({ name_en: z.string().nullable().optional(), tags: z.array(z.string()).optional(),
    units: z.array(foodUnitSchema).optional(), replaces_id: z.string().nullable().optional() }).safeParse(row);
  return parsed.success ? { nameEn: parsed.data.name_en, tags: parsed.data.tags, units: parsed.data.units,
    ...(parsed.data.replaces_id ? { replacesId: parsed.data.replaces_id } : {}) } : {};
}
export function mealDayType(row: unknown) {
  const parsed = z.object({ day_type: z.enum(['all', 'training', 'rest']) }).safeParse(row);
  return parsed.success ? parsed.data.day_type : 'all';
}
