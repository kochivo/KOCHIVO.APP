'use server';

import { getT } from '@/core/i18n/server';
import { uuidv7 } from '@/core/offline/ids';
import { messages } from '../messages';
import { customFoodSchema } from '../types';
import type { CustomFoodInput, Food } from '../types';
import { planClient, toFood } from './client';

export async function createCustomFood(input: CustomFoodInput): Promise<Food> {
  const t = await getT(messages);
  const parsed = customFoodSchema.safeParse(input);
  if (!parsed.success) throw new Error(t('invalidCustomFood'));
  const value = parsed.data;
  const client = await planClient();
  const user = await client.auth.getUser();
  if (user.error || !user.data.user) throw new Error(t('signInFirst'));
  const owner = user.data.user.id;
  if (value.photoPath && !new RegExp(`^captain-food-photos/${owner}/[0-9a-f-]+\\.jpg$`).test(value.photoPath)) {
    throw new Error(t('invalidCustomFood'));
  }
  const profile = await client.from('profiles').select('role').eq('id', owner).single();
  if (profile.error || profile.data?.role !== 'captain') throw new Error(t('couldntSaveTryAgain'));
  const per100 = (number: number) => Math.round(number / value.servingGrams * 1000) / 10;
  const { data, error } = await client.from('foods').insert({
    id: uuidv7(), owner_id: owner, source: 'captain', name_ar: value.name, name_en: null,
    kcal_per_100g: per100(value.kcal), protein_per_100g: per100(value.protein),
    carbs_per_100g: per100(value.carbs), fat_per_100g: per100(value.fat), photo_path: value.photoPath ?? null,
  }).select('*').single();
  if (error || !data) throw new Error(t('couldntSaveTryAgain'));
  return toFood(data);
}
