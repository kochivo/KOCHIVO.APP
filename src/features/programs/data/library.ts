'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { supabaseServer } from '@/core/supabase/server';
import { unstable_rethrow } from 'next/navigation';
import { escapeSearch } from '../summary';
import { bodyPartFilter } from '../custom-exercises';
import type { LibraryExercise, Result } from '../types';

export async function searchExercises({ query, bodyPart, limit = 30, mine = false, bodyParts, metadata = false, page, equipment }: {
  query: string; bodyPart: string; limit?: 30; mine?: boolean; bodyParts?: string[]; metadata?: boolean;
  page?: number; equipment?: string[];
}): Promise<Result<LibraryExercise[]> & { total?: number }> {
  const t = await getT(messages);
  try {
    const client = await supabaseServer();
    const auth = await client.auth.getClaims();
    if (auth.error || !auth.data?.claims.sub) return { error: t('couldntLoadExercisesTryAgain') };
    // Quoting the PostgREST value also keeps commas and parentheses inside the search term.
    const pattern = `"%${escapeSearch(query.trim().slice(0, 120)).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;
    let request = client.from('exercises').select('id,name_ar,name_en,body_part,equipment,media_path,owner_id,target,video_url,archived_at,instructions_ar,instructions_en,secondary_muscles',
      page === undefined ? undefined : { count: 'exact' })
      .is('archived_at', null);
    if (mine) request = request.eq('owner_id', auth.data.claims.sub);
    if (query.trim()) request = request.or(`name_ar.ilike.${pattern},name_en.ilike.${pattern}${metadata ? `,body_part.ilike.${pattern},equipment.ilike.${pattern}` : ''}`);
    if (bodyParts?.length) request = request.in('body_part', bodyParts.slice(0, 20));
    if (equipment?.length) request = request.in('equipment', equipment.slice(0, 20));
    const filters = bodyPartFilter(bodyPart);
    if (filters.length > 1) request = request.or(filters.map(({ column, value }) => `${column}.eq.${value}`).join(','));
    else if (filters[0]) request = request.eq(filters[0].column, filters[0].value);
    const ordered = request.order('name_en');
    const size = Math.min(limit, 30);
    const offset = (Number.isSafeInteger(page) && (page ?? 0) > 0 ? page ?? 0 : 0) * size;
    const result = await (page === undefined ? ordered.limit(size) : ordered.order('id').range(offset, offset + size - 1));
    return result.error ? { error: t('couldntLoadExercisesTryAgain') } : {
      data: result.data.map(row => ({ ...row, is_own: row.owner_id === auth.data.claims.sub })),
      ...(page === undefined ? {} : { total: result.count ?? 0 }),
    };
  } catch (error) { unstable_rethrow(error); return { error: t('couldntLoadExercisesTryAgain') }; }
}
