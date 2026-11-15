import { z } from 'zod';

export const estimatedPricesSchema = z.array(z.object({
  seed_key: z.string().min(1), unit: z.enum(['kg', 'piece', 'pack']),
  unit_grams: z.number().positive(), price_egp: z.number().positive(), estimate: z.literal(true),
}).refine(row => row.unit !== 'kg' || row.unit_grams === 1000));

export function mapFoodPrices(input: unknown, foods: { id: string; seed_key: string | null }[]) {
  const entries = estimatedPricesSchema.parse(input);
  const missing: string[] = [];
  const rows = entries.flatMap(({ seed_key, unit, unit_grams, price_egp }) => {
    const food = foods.find(food => food.seed_key === seed_key);
    if (!food) { missing.push(seed_key); return []; }
    return [{ unit, unit_grams, price_egp, food_id: food.id, owner_id: null }];
  });
  return { rows, missing };
}
