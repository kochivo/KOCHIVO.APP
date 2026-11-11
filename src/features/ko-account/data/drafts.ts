import { uuidv7 } from '@/core/offline/ids';
import { macrosFor, sumMacros } from '@/lib/macros';
import type { KoActor } from './account';
import type { Intent } from './intents';
import type { Approval } from './approval';
import { matchNamed } from './match';

type Draft = Extract<Intent, { kind: 'create_training' | 'create_nutrition' }>;
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
  if (intent.kind === 'create_training') {
    const { title, days } = intent.args;
    if (new Set(days.map(day => day.weekday)).size !== days.length) return null;
    const items = await catalog(offset => actor.db.from('exercises').select('id,name_ar,name_en')
      .is('archived_at', null).order('id').range(offset, offset + 499));
    const daysByWeekday = new Map(days.map(day => [day.weekday, day]));
    let valid = true;
    const week = Array.from({ length: 7 }, (_, index) => {
      const day = daysByWeekday.get((index + 6) % 7);
      const dayId = uuidv7();
      const exercises = (day?.exercises ?? []).flatMap((row, position) => {
        const matches = matchNamed(items, row.name);
        if (matches.length !== 1 || !matches[0]) { valid = false; return []; }
        return [{ id: uuidv7(), day_id: dayId, exercise_id: matches[0].id, position: position + 1,
          sets: row.sets, reps_min: row.reps, reps_max: null, superset_group: null, rest_seconds: 90 }];
      });
      return { id: dayId, program_id: id, weekday: index, position: index + 1, title: day?.title ?? '', is_rest_day: !day, exercises, cardio: [] };
    });
    const preview = days.map(day => `${day.title}: ${day.exercises.map(item => `${item.name} (${item.sets} × ${item.reps})`).join(', ')}`).join('\n');
    return valid ? { payload: { id, title, days: week, repeatWeekly: true }, preview } : null;
  }

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
