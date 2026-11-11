'use server';

import { ok, fail } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';
import { getT } from '@/core/i18n/server';
import { uuidv7 } from '@/core/offline/ids';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { messages } from '../messages';
import { customFoodSchema } from '../types';
import type { CustomFoodInput, Food } from '../types';
import { planClient, toFood } from './client';
import type { TablesInsert, TablesUpdate } from '@/types/database';

async function writeCustomFood(input: CustomFoodInput, id?: string): Promise<ActionResult<Food>> {
  const t = await getT(messages);
  const parsed = customFoodSchema.safeParse(input);
  if (!parsed.success) return fail(t('invalidCustomFood'));
  const value = parsed.data;
  const client = await planClient();
  const user = await client.auth.getUser();
  if (user.error || !user.data.user) return fail(t('signInFirst'));
  const owner = user.data.user.id;
  if (value.photoPath && !new RegExp(`^captain-food-photos/${owner}/[0-9a-f-]+\\.jpg$`).test(value.photoPath)) {
    return fail(t('invalidCustomFood'));
  }
  const profile = await client.from('profiles').select('role').eq('id', owner).single();
  if (profile.error || profile.data?.role !== 'captain') return fail(t('couldntSaveTryAgain'));
  const per100 = (number: number) => Math.round(number / value.servingGrams * 1000) / 10;
  const previous = id ? await client.from('foods').select('photo_path').eq('id', id).eq('owner_id', owner).single() : null;
  if (previous?.error) return fail(t('couldntSaveTryAgain'));
  const original = !id && value.copyFrom ? await client.from('foods').select('photo_path')
    .eq('id', value.copyFrom).is('owner_id', null).single() : null;
  if (original?.error) return fail(t('couldntSaveTryAgain'));
  const values = {
    owner_id: owner, source: 'captain', name_ar: value.name,
    ...(value.nameEn !== undefined ? { name_en: value.nameEn || null } : id ? {} : { name_en: null }),
    ...(value.units !== undefined ? { units: value.units } : {}),
    kcal_per_100g: per100(value.kcal), protein_per_100g: per100(value.protein),
    carbs_per_100g: per100(value.carbs), fat_per_100g: per100(value.fat),
    photo_path: value.photoPath ?? previous?.data?.photo_path ?? original?.data?.photo_path ?? null,
  };
  // Migration 0092 adds units; the generated database types still predate that column.
  const update: TablesUpdate<'foods'> = values;
  const insert: TablesInsert<'foods'> = { ...values, id: uuidv7() };
  const request = id ? client.from('foods').update(update).eq('id', id).eq('owner_id', owner)
    : client.from('foods').insert(insert);
  const { data, error } = await request.select('*').single();
  if (error || !data) return fail(t('couldntSaveTryAgain'));
  if (previous?.data?.photo_path && previous.data.photo_path !== data.photo_path) {
    await removePhoto(client, previous.data.photo_path);
  }
  return ok(toFood(data));
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

export async function createCustomFood(input: CustomFoodInput): Promise<ActionResult<Food>> {
  return writeCustomFood(input);
}

export async function updateCustomFood(id: string, input: CustomFoodInput): Promise<ActionResult<Food>> {
  if (!z.uuid().safeParse(id).success) return fail((await getT(messages))('invalidCustomFood'));
  return writeCustomFood(input, id);
}

export async function deleteCustomFood(id: string, blockUsed = false): Promise<ActionResult<{ archived: true } | void>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) return fail(t('foodDeleteFailed'));
  const client = await planClient();
  const user = await client.auth.getUser();
  if (user.error || !user.data.user) return fail(t('signInFirst'));
  const { data, error } = await client.from('foods').delete().eq('id', id)
    .eq('owner_id', user.data.user.id).select('photo_path').single();
  if (error?.code === '23503') {
    if (blockUsed) return fail(t('foodDeleteFailed'));
    const archived = await client.from('foods').update({ archived_at: new Date().toISOString() })
      .eq('id', id).eq('owner_id', user.data.user.id).select('id').single();
    if (archived.error || !archived.data) return fail(t('foodDeleteFailed'));
    return ok({ archived: true });
  }
  if (error || !data) return fail(t('foodDeleteFailed'));
  if (data.photo_path) await removePhoto(client, data.photo_path);
  return ok(undefined);
}
