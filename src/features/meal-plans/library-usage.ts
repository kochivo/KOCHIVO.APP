import { z } from 'zod';

const meal = z.object({ plan_id: z.string() }).nullable();
const usage = z.object({ meal_items: z.array(z.object({ meals: meal })),
  meal_item_alternatives: z.array(z.object({ meal_items: z.object({ meals: meal }).nullable() })) });

export function libraryUsage(row: unknown) {
  const parsed = usage.parse(row);
  const plans = [...parsed.meal_items.map(item => item.meals?.plan_id),
    ...parsed.meal_item_alternatives.map(item => item.meal_items?.meals?.plan_id)].filter(Boolean);
  return { uses: new Set(plans).size, alternativeUses: parsed.meal_item_alternatives.length };
}
