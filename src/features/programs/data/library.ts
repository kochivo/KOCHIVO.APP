'use server';

import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { supabaseServer } from '@/core/supabase/server';
import { escapeSearch } from '../summary';
import type { LibraryExercise, Result } from '../types';

export async function searchExercises({ query, bodyPart, limit = 30 }: {
  query: string; bodyPart: string; limit?: 30;
}): Promise<Result<LibraryExercise[]>> {
  const t = await getT(messages);
  try {
    const client = await supabaseServer();
    // Quoting the PostgREST value also keeps commas and parentheses inside the search term.
    const pattern = `"%${escapeSearch(query.trim().slice(0, 120)).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;
    let request = client.from('exercises').select('id,name_ar,name_en,body_part,equipment,media_path');
    if (query.trim()) request = request.or(`name_ar.ilike.${pattern},name_en.ilike.${pattern}`);
    if (bodyPart) request = request.eq('body_part', bodyPart);
    const result = await request.order('name_en').limit(Math.min(limit, 30));
    return result.error ? { error: t('couldntLoadExercisesTryAgain') } : { data: result.data };
  } catch { return { error: t('couldntLoadExercisesTryAgain') }; }
}
