import { uuidv7 } from '@/core/offline/ids';
import { macrosFor, sumMacros } from '@/lib/macros';
import type { KoActor } from './account';
import type { Intent } from './intents';
import type { Approval } from './approval';
import { matchNamed } from './match';

type Draft = Extract<Intent, { kind: 'create_nutrition' }>;
async function catalog<T>(load: (offset: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let offset = 0; offset < 3000; offset += 500) {
    const { data, error } = await load(offset);
    if (error) throw error;
    if (!data) return rows;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
  return rows;
}

export async function buildDraft(actor: KoActor, intent: Draft): Promise<{
  payload: Approval['payload']; preview: string; actual?: ReturnType<typeof sumMacros>;
} | null> {
  const id = uuidv7();
  const { title, targets, meals } = intent.args;
  const foods = await catalog(offset => actor.db.from('foods')
    .select('id,name_ar,name_en,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g')
    .order('id').range(offset, offset + 499));
  const macros: ReturnType<typeof macrosFor>[] = [];
  let valid = true;
  const draft = meals.map(meal => ({
    id: uuidv7(), name: meal.name,
    items: meal.items.flatMap(item => {
      const matches = matchNamed(foods, item.food);
      if (matches.length !== 1 || !matches[0]) { valid = false; return []; }
      const food = matches[0];
      macros.push(macrosFor({ kcal: food.kcal_per_100g, protein: food.protein_per_100g,
        carbs: food.carbs_per_100g, fat: food.fat_per_100g }, item.grams));
      return [{ id: uuidv7(), food: { id: food.id }, grams: item.grams, alternatives: [] }];
    }),
  }));
  const preview = meals.map(meal => `${meal.name}: ${meal.items.map(item => `${item.food} (${item.grams} g)`).join(', ')}`).join('\n');
  return valid ? { payload: { id, title, targets, meals: draft }, preview, actual: sumMacros(macros) } : null;
}
