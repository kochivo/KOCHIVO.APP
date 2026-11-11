import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase as Database } from '@/types/app-database';
import type { Candidate } from '../pick';

type LoadResult = { data: Candidate[]; error?: never } |
  { error: 'unauthenticated' | 'catalog_load_failed' | 'usage_load_failed'; data?: never };
const pageSize = 500;

export async function loadCandidates(client: SupabaseClient<Database>): Promise<LoadResult> {
  const claims = await client.auth.getClaims();
  const captain = claims.data?.claims.sub;
  if (claims.error || !captain) return { error: 'unauthenticated' };
  const candidates: Candidate[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.from('exercise_generator_tags')
      .select('*, exercises!inner(id, name_ar, name_en, body_part, equipment, media_path, owner_id)')
      .is('exercises.owner_id', null).order('exercise_id').range(offset, offset + pageSize - 1);
    if (page.error) return { error: 'catalog_load_failed' };
    for (const row of page.data) {
      candidates.push({ exercise_id: row.exercise_id, pattern: row.pattern, kind: row.kind,
        equipment: row.equipment, stress: row.stress, min_level: row.min_level,
        usage: 0, library: row.exercises });
    }
    if (page.data.length < pageSize) break;
  }
  const counts = new Map<string, number>();
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.from('program_exercises')
      .select('id, exercise_id, program_days!inner(programs!inner(captain_id))')
      .eq('program_days.programs.captain_id', captain).order('id').range(offset, offset + pageSize - 1);
    if (page.error) return { error: 'usage_load_failed' };
    for (const row of page.data) counts.set(row.exercise_id, (counts.get(row.exercise_id) ?? 0) + 1);
    if (page.data.length < pageSize) break;
  }
  return { data: candidates.map(row => ({ ...row, usage: counts.get(row.exercise_id) ?? 0 })) };
}
