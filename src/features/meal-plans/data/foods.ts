'use server';

import { ok, fail } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { planClient, toFood } from './client';
import { escapeSearch } from '../types';
import type { Food } from '../types';

const CATEGORY_MACRO_THRESHOLDS = { protein: 10, carbs: 20 } as const;

export async function searchFoods({ query, limit = 30, mine = false, category }: { query: string; limit?: number; mine?: boolean; category?: 'protein' | 'carbs' }): Promise<ActionResult<{ foods: Food[]; catalogEmpty: boolean }>> {
  const t = await getT(messages);
  const client = await planClient();
  let request = client.from('foods').select('*').is('archived_at', null).order('name_ar').limit(Math.max(1, Math.min(30, limit)));
  if (category) request = request.gte(category === 'protein' ? 'protein_per_100g' : 'carbs_per_100g', CATEGORY_MACRO_THRESHOLDS[category]);
  if (mine) {
    const { data, error } = await client.auth.getClaims();
    if (error || !data?.claims.sub) return fail(t('signInFirst'));
    request = request.eq('owner_id', data.claims.sub);
  }
  if (query.trim()) {
    const pattern = `%${escapeSearch(query.trim().slice(0, 100))}%`;
    request = request.or(`name_ar.ilike."${pattern}",name_en.ilike."${pattern}"`);
  }
  const { data, error } = await request;
  if (error) return fail(t('searchFailedTryAgain'));
  let catalogEmpty = !mine && !query.trim() && !data?.length;
  if (!mine && query.trim() && !data?.length) {
    const catalog = await client.from('foods').select('id').is('archived_at', null).limit(1);
    if (catalog.error) return fail(t('searchFailedTryAgain'));
    catalogEmpty = !catalog.data?.length;
  }
  return ok({ foods: (data ?? []).map(toFood), catalogEmpty });
}
