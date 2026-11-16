'use server';

import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { fail, ok } from '@/lib/action-result';
import { planClient, toFood } from './client';
import type { FoodRow } from './client';
import { FOOD_LIBRARY_SELECT } from './food-library-columns';
import { foodFields } from './editor-fields';
import { libraryUsage } from '../library-usage';
import { foodReplacements } from './food-replacements';
import { favoritesClient } from './favorites-client';
import { messages } from '../components/library/messages';
import type { LibraryFood } from './library-types';

export async function loadFoodLibrary() {
  const client = await planClient();
  const user = await client.auth.getUser();
  if (!user.data.user) throw new Error((await getT(messages))('error'));
  const replacements = await foodReplacements(client);
  if (replacements.error) throw new Error((await getT(messages))('error'));
  const foods: LibraryFood[] = [];
  let cursor: string | null = null;
  do {
    let request = client.from('foods').select(`${FOOD_LIBRARY_SELECT},created_at`).is('archived_at', null).order('id').limit(400);
    if (cursor) request = request.gt('id', cursor);
    if (replacements.versions.size) request = request.not('id', 'in', `(${[...replacements.versions.values()].join(',')})`);
    const page = await request.overrideTypes<FoodRow[], { merge: false }>();
    if (page.error) throw new Error((await getT(messages))('error'));
    const rows = page.data ?? [];
    foods.push(...rows.map(row => ({ ...toFood(row), ...foodFields(row), ...libraryUsage(row),
      addedAt: z.object({ created_at: z.string().optional() }).parse(row).created_at,
      replacesId: replacements.versions.get(row.id) })));
    cursor = rows.length === 400 ? rows.at(-1)?.id ?? null : null;
  } while (cursor);
  // This table is newer than the generated schema; validate the boundary explicitly.
  const result = await favoritesClient(client).from('food_favorites').select('food_id').eq('captain_id', user.data.user.id);
  // Favorites are a convenience; the food list must still open when they cannot load.
  if (result.error) console.warn('Loading food favorites failed', result.error.message);
  const favorites = result.error ? [] : z.array(z.object({ food_id: z.string() })).parse(result.data).map(row => row.food_id);
  return { foods, favorites };
}

export async function setFoodFavorite(foodId: string, favorite: boolean) {
  const t = await getT(messages);
  if (!z.uuid().safeParse(foodId).success) return fail(t('error'));
  const client = await planClient();
  const user = await client.auth.getUser();
  if (!user.data.user) return fail(t('error'));
  const table = favoritesClient(client).from('food_favorites');
  const result = favorite
    ? await table.upsert({ captain_id: user.data.user.id, food_id: foodId }, { onConflict: 'captain_id,food_id', ignoreDuplicates: true })
    : await table.delete().eq('captain_id', user.data.user.id).eq('food_id', foodId);
  return result.error ? fail(t('error')) : ok(undefined);
}
