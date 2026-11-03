'use server';

import { planClient, toFood } from './client';
import { escapeSearch } from '../types';
import type { Food } from '../types';

export async function searchFoods({ query, limit = 30 }: { query: string; limit?: number }): Promise<{ foods: Food[]; catalogEmpty: boolean }> {
  const client = await planClient();
  let request = client.from('foods').select('*').order('name_ar').limit(Math.max(1, Math.min(30, limit)));
  if (query.trim()) {
    const pattern = `%${escapeSearch(query.trim().slice(0, 100))}%`;
    request = request.or(`name_ar.ilike."${pattern}",name_en.ilike."${pattern}"`);
  }
  const { data, error } = await request;
  if (error) throw new Error('البحث متعملش. جرّب تاني');
  let catalogEmpty = !query.trim() && !data?.length;
  if (query.trim() && !data?.length) {
    const catalog = await client.from('foods').select('id').limit(1);
    if (catalog.error) throw new Error('البحث متعملش. جرّب تاني');
    catalogEmpty = !catalog.data?.length;
  }
  return { foods: (data ?? []).map(toFood), catalogEmpty };
}
