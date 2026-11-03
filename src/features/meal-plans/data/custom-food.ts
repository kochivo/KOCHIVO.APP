'use server';

import { getT } from '@/core/i18n/server';
import { uuidv7 } from '@/core/offline/ids';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { messages } from '../messages';
import { customFoodSchema } from '../types';
import type { CustomFoodInput, Food } from '../types';
import { planClient, toFood } from './client';

async function writeCustomFood(input: CustomFoodInput, id?: string): Promise<Food> {
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
  const previous = id ? await client.from('foods').select('photo_path').eq('id', id).eq('owner_id', owner).single() : null;
  if (previous?.error) throw new Error(t('couldntSaveTryAgain'));
  const values = {
    owner_id: owner, source: 'captain', name_ar: value.name, name_en: null,
    kcal_per_100g: per100(value.kcal), protein_per_100g: per100(value.protein),
    carbs_per_100g: per100(value.carbs), fat_per_100g: per100(value.fat),
    photo_path: value.photoPath ?? previous?.data?.photo_path ?? null,
  };
  const request = id ? client.from('foods').update(values).eq('id', id).eq('owner_id', owner)
    : client.from('foods').insert({ ...values, id: uuidv7() });
  const { data, error } = await request.select('*').single();
  if (error || !data) throw new Error(t('couldntSaveTryAgain'));
  if (previous?.data?.photo_path && previous.data.photo_path !== data.photo_path) {
    await removePhoto(client, previous.data.photo_path);
  }
  return toFood(data);
}

async function removePhoto(client: Awaited<ReturnType<typeof planClient>>, path: string) {
  const prefix = 'captain-food-photos/';
  if (!path.startsWith(prefix)) return;
  try {
    const { error } = await client.storage.from('captain-food-photos').remove([path.slice(prefix.length)]);
    // The database write has succeeded; a cleanup failure must not roll it back in the UI.
    if (error) console.warn('Custom food photo cleanup failed', error.message);
  } catch (error) {
    unstable_rethrow(error);
    console.warn('Custom food photo cleanup failed');
  }
}

export async function createCustomFood(input: CustomFoodInput): Promise<Food> {
  return writeCustomFood(input);
}

export async function updateCustomFood(id: string, input: CustomFoodInput): Promise<Food> {
  if (!z.uuid().safeParse(id).success) throw new Error((await getT(messages))('invalidCustomFood'));
  return writeCustomFood(input, id);
}

export async function deleteCustomFood(id: string): Promise<{ error: 'in-use' } | void> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) throw new Error(t('foodDeleteFailed'));
  const client = await planClient();
  const user = await client.auth.getUser();
  if (user.error || !user.data.user) throw new Error(t('signInFirst'));
  const { data, error } = await client.from('foods').delete().eq('id', id)
    .eq('owner_id', user.data.user.id).select('photo_path').single();
  // Expected errors cross the action boundary as data; Next masks thrown messages in production.
  if (error?.code === '23503') return { error: 'in-use' };
  if (error || !data) throw new Error(t('foodDeleteFailed'));
  if (data.photo_path) await removePhoto(client, data.photo_path);
}
