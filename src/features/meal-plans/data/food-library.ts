'use server';

import { z } from 'zod';
import { getT } from '@/core/i18n/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { fail, ok } from '@/lib/action-result';
import { messages } from '../components/library/messages';
import { duplicateFood, foodSearchPattern } from '../food-library-rules';
import { foodFields } from './editor-fields';
import { FOOD_LIBRARY_SELECT } from './food-library-columns';
import { planClient, toFood } from './client';
import type { FoodRow } from './client';
import { deleteCustomFood } from './custom-food';
import type { FoodSegment, LibraryPage } from './library-types';
import type { ActionResult } from '@/lib/action-result';
import { libraryUsage } from '../library-usage';
import { foodReplacements } from './food-replacements';

const inputSchema = z.object({ query: z.string().max(100), segment: z.enum(['all', 'mine', 'global']), cursor: z.uuid().nullish() });

export async function listLibraryFoods(input: { query: string; segment: FoodSegment; cursor?: string | null }): Promise<ActionResult<LibraryPage>> {
  const t = await getT(messages);
  const parsed = inputSchema.safeParse(input);
  if (!captainWorkspaceEnabled() || !parsed.success) return fail(t('error'));
  const client = await planClient();
  const user = await client.auth.getUser();
  if (!user.data.user) return fail(t('error'));
  const owner = user.data.user.id;
  const replacements = await foodReplacements(client);
  if (replacements.error) return fail(t('error'));
  const hidden = `(${[...replacements.versions.values()].join(',')})`;
  const { query, segment, cursor } = parsed.data;
  const filtered = () => {
    let request = client.from('foods').select('id', { count: 'exact', head: true }).is('archived_at', null);
    if (replacements.versions.size) request = request.not('id', 'in', hidden);
    if (query.trim()) {
      const pattern = foodSearchPattern(query).replace(/[\\"]/g, character => `\\${character}`);
      request = request.or(`name_ar.imatch."${pattern}",name_en.imatch."${pattern}"`);
    }
    return request;
  };
  let request = client.from('foods').select(FOOD_LIBRARY_SELECT)
    .is('archived_at', null).order('id').limit(40);
  if (replacements.versions.size) request = request.not('id', 'in', hidden);
  if (cursor) request = request.gt('id', cursor);
  if (segment === 'mine') request = request.eq('owner_id', owner);
  if (segment === 'global') request = request.is('owner_id', null);
  if (query.trim()) {
    const pattern = foodSearchPattern(query).replace(/[\\"]/g, character => `\\${character}`);
    request = request.or(`name_ar.imatch."${pattern}",name_en.imatch."${pattern}"`);
  }
  const [page, all, mine, global] = await Promise.all([
    // The generated schema predates units; foodFields and libraryUsage validate their runtime shapes.
    request.overrideTypes<FoodRow[], { merge: false }>(), filtered(), filtered().eq('owner_id', owner), filtered().is('owner_id', null),
  ]);
  if (page.error || all.error || mine.error || global.error) return fail(t('error'));
  const rows = page.data ?? [];
  return ok({ foods: rows.map(row => ({ ...toFood(row), ...foodFields(row), ...libraryUsage(row),
    replacesId: replacements.versions.get(row.id) })),
    cursor: rows.length === 40 ? rows.at(-1)?.id ?? null : null,
    counts: { all: all.count ?? 0, mine: mine.count ?? 0, global: global.count ?? 0 } });
}

export async function deleteLibraryFood(id: string): Promise<ActionResult<void>> {
  const t = await getT(messages);
  if (!captainWorkspaceEnabled() || !z.uuid().safeParse(id).success) return fail(t('error'));
  const client = await planClient();
  const user = await client.auth.getUser();
  if (!user.data.user) return fail(t('error'));
  const food = await client.from('foods').select('owner_id').eq('id', id).single();
  if (food.error || food.data?.owner_id !== user.data.user.id) return fail(t('readonly'));
  const [usage, alternatives] = await Promise.all([
    client.from('meal_items').select('id', { count: 'exact', head: true }).eq('food_id', id),
    client.from('meal_item_alternatives').select('id', { count: 'exact', head: true }).eq('food_id', id),
  ]);
  if (usage.error || alternatives.error) return fail(t('error'));
  const count = (usage.count ?? 0) + (alternatives.count ?? 0);
  if (count) return fail(t('blocked', { n: count, count }));
  const deleted = await deleteCustomFood(id, true);
  return deleted.ok ? ok(undefined) : deleted;
}

export async function restoreLibraryFood(id: string) {
  return deleteCustomFood(id);
}

export async function checkFoodDuplicate(name: string, nameEn: string, id?: string): Promise<ActionResult<boolean>> {
  const t = await getT(messages);
  if (!captainWorkspaceEnabled() || name.length > 60 || nameEn.length > 100) return fail(t('duplicateError'));
  const client = await planClient();
  // Normalize every visible name, in bounded batches, so matches outside the current page are included.
  let cursor: string | undefined;
  for (;;) {
    let request = client.from('foods').select('id,name_ar,name_en').is('archived_at', null).order('id').limit(200);
    if (cursor) request = request.gt('id', cursor);
    const result = await request;
    if (result.error) return fail(t('duplicateError'));
    const rows = result.data ?? [];
    if (duplicateFood(name, nameEn, rows.map(row => ({ id: row.id, name: row.name_ar, nameEn: row.name_en })), id)) return ok(true);
    if (rows.length < 200) return ok(false);
    cursor = rows.at(-1)?.id;
  }
}
