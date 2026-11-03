'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { planClient, toFood } from './client';
import { escapeSearch } from '../types';
import type { Food } from '../types';

export async function searchFoods({ query, limit = 30, mine = false }: { query: string; limit?: number; mine?: boolean }): Promise<{ foods: Food[]; catalogEmpty: boolean }> {
  const t = await getT(messages);
  const client = await planClient();
  let request = client.from('foods').select('*').order('name_ar').limit(Math.max(1, Math.min(30, limit)));
  if (mine) {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error(t('signInFirst'));
    request = request.eq('owner_id', data.user.id);
  }
  if (query.trim()) {
    const pattern = `%${escapeSearch(query.trim().slice(0, 100))}%`;
    request = request.or(`name_ar.ilike."${pattern}",name_en.ilike."${pattern}"`);
  }
  const { data, error } = await request;
  if (error) throw new Error(t('searchFailedTryAgain'));
  let catalogEmpty = !mine && !query.trim() && !data?.length;
  if (!mine && query.trim() && !data?.length) {
    const catalog = await client.from('foods').select('id').limit(1);
    if (catalog.error) throw new Error(t('searchFailedTryAgain'));
    catalogEmpty = !catalog.data?.length;
  }
  return { foods: (data ?? []).map(toFood), catalogEmpty };
}
