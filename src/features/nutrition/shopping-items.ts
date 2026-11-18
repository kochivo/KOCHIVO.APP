import { weeklyShoppingList } from '@/features/meal-plans';
import type { BudgetDay } from '@/features/meal-plans';
import type { NutritionMeal } from '@/core/offline';

export const aisles = ['protein', 'produce', 'dairy', 'pantry', 'other'] as const;
type Aisle = typeof aisles[number];
type CatalogFood = { id: string; seed_key: string | null; name_ar: string; name_en: string | null; kcal_per_100g: number; protein_per_100g: number };

function aisle(seed: string): Aisle {
  if (/chicken|beef|tuna|fish|salmon|eggs|turkey|meat|shrimp|sardine|tilapia/.test(seed)) return 'protein';
  if (/banana|apple|orange|tomato|potato|pepper|carrot|cucumber|lettuce|onion|broccoli|vegetable|fruit|spinach|dates/.test(seed)) return 'produce';
  if (/milk|cheese|feta|yogurt|labneh|laban/.test(seed)) return 'dairy';
  if (/rice|pasta|oats|bread|lentil|bean|foul|oil|flour|peanut|tahini/.test(seed)) return 'pantry';
  return 'other';
}

type ShoppingItem = {
  id: string; name: string; aisle: Aisle; quantity: number;
  unit: 'kg' | 'piece' | 'pack' | 'grams'; cost?: number;
};

export function shoppingItems(days: BudgetDay[], meals: NutritionMeal[][], catalog: CatalogFood[], budget: boolean, english: boolean) {
  const priced = weeklyShoppingList(days);
  const byId = new Map(catalog.map(food => [food.id, food]));
  const items = new Map<string, ShoppingItem>(priced.items.map(item => [item.food.id, {
    id: item.food.id, name: item.food.name, aisle: aisle(byId.get(item.food.id)?.seed_key ?? ''),
    quantity: item.units, unit: item.food.unit, cost: budget ? item.costEgp : undefined,
  }]));
  for (const day of meals) for (const meal of day) for (const item of meal.items) {
    const food = catalog.find(food => food.name_ar === item.name && food.kcal_per_100g === item.per100g.kcal && food.protein_per_100g === item.per100g.protein);
    const id = food?.id ?? JSON.stringify([item.name, item.per100g]);
    const existing = items.get(id);
    if (existing && existing.unit !== 'grams') continue;
    items.set(id, { id, name: (english && food?.name_en) || item.name, aisle: aisle(food?.seed_key ?? ''),
      quantity: (existing?.quantity ?? 0) + item.grams, unit: 'grams' });
  }
  return { items: [...items.values()], total: priced.total, hasEstimate: budget && priced.items.length > 0 };
}
