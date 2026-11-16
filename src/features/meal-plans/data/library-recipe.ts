'use server';
import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { createT } from '@/core/i18n/messages';
import { uuidv7 } from '@/core/offline/ids';
import { fail, ok } from '@/lib/action-result';
import { planClient, toFood } from './client';
import { foodFields } from './editor-fields';
import { messages } from '../components/library/messages';
import { messages as recipeMessages } from '../components/library/v2/messages';
import { recipeNutrition } from '../components/library/library-model';
import type { Food } from '../types';
import type { AppDatabase } from '@/types/app-database';

const schema = z.object({ name: z.string().trim().min(1).max(60), cookedWeight: z.number().positive().max(100000),
  ingredients: z.array(z.object({ id: z.uuid(), grams: z.number().positive().max(10000) })).min(1).max(50) });
export async function saveLibraryRecipe(input: z.infer<typeof schema>) {
  const t = await getT(messages), parsed = schema.safeParse(input);
  if (!parsed.success) return fail(t('error'));
  const client = await planClient(), user = await client.auth.getUser();
  if (!user.data.user) return fail(t('error'));
  const profile = await client.from('profiles').select('role').eq('id', user.data.user.id).single();
  if (profile.error || profile.data?.role !== 'captain') return fail(t('error'));
  const value = parsed.data;
  const result = await client.from('foods').select('*').in('id', value.ingredients.map(item => item.id)).is('archived_at', null);
  if (result.error) return fail(t('error'));
  const foods = new Map((result.data ?? []).map(row => [row.id, { ...toFood(row), ...foodFields(row) }]));
  const ingredients = value.ingredients.map(item => ({ food: foods.get(item.id), grams: item.grams }));
  if (ingredients.some(item => !item.food)) return fail(t('error'));
  const validated = ingredients as { food: Food; grams: number }[];
  const { per100 } = recipeNutrition(validated, value.cookedWeight);
  if (per100.kcal > 900 || per100.protein + per100.carbs + per100.fat > 100) return fail(t('error'));
  const nutrients = (key: 'fiber_per_100g' | 'sugar_per_100g' | 'sodium_mg_per_100g') => validated.some(item => item.food[key] == null) ? null :
    Math.round(validated.reduce((sum, item) => sum + Number(item.food[key]) * item.grams / 100, 0) / value.cookedWeight * 1000) / 10;
  const row = {
    id: uuidv7(), owner_id: user.data.user.id, source: 'captain', name_ar: value.name, state: 'cooked' as const, source_kind: 'recipe' as const,
    kcal_per_100g: per100.kcal, protein_per_100g: per100.protein, carbs_per_100g: per100.carbs, fat_per_100g: per100.fat,
    fiber_per_100g: nutrients('fiber_per_100g'), sugar_per_100g: nutrients('sugar_per_100g'), sodium_mg_per_100g: nutrients('sodium_mg_per_100g'),
    source_ref: { cooked_yield_g: value.cookedWeight, ingredients: validated.map(item => ({
      food_id: item.food.id,
      fdc_id: item.food.source_ref && 'fdc_id' in item.food.source_ref ? item.food.source_ref.fdc_id : item.food.id,
      grams: item.grams, description: item.food.name, diet_tags: item.food.diet_tags ?? [],
    })) },
    units: (['small', 'medium', 'large'] as const).map((key, index) => ({ key, grams: 250 + index * 100,
      name_ar: createT(recipeMessages, 'ar')(key, { grams: 250 + index * 100 }),
      name_en: createT(recipeMessages, 'en')(key, { grams: 250 + index * 100 }),
    })),
  };
  // The generated schema predates household units; keep them in the runtime payload.
  const insert: AppDatabase['public']['Tables']['foods']['Insert'] = row;
  const saved = await client.from('foods').insert(insert).select('*').single();
  return saved.error || !saved.data ? fail(t('error')) : ok({ ...toFood(saved.data), ...foodFields(saved.data) });
}
