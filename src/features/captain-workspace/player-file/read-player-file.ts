import 'server-only';
import { cache } from 'react';
import { supabaseServer } from '@/core/supabase/server';
import { loadPlayerFile } from '@/features/player-file';
import type { TaggedExercise } from '../training/fit-checks';

export const readPlayerFile = cache(async (playerId: string) => loadPlayerFile(await supabaseServer(), playerId));

export const readTrainingPlayerFile = cache(async (playerId: string) => {
  const client = await supabaseServer();
  const [file, scan] = await Promise.all([
    readPlayerFile(playerId),
    client.from('body_scans').select('fat_pct').eq('player_id', playerId).not('fat_pct', 'is', null)
      .order('scan_date', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1),
  ]);
  if (scan.error) throw scan.error;
  const candidates: TaggedExercise[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await client.from('exercise_generator_tags')
      .select('exercise_id,pattern,stress,exercises!inner(id,name_ar,name_en,body_part,equipment,media_path)')
      .order('exercise_id').range(offset, offset + 499);
    if (page.error) throw page.error;
    for (const row of page.data) if (row.exercises) candidates.push({
      exercise_id: row.exercise_id, pattern: row.pattern, stress: row.stress, library: row.exercises,
    });
    if (page.data.length < 500) break;
  }
  return { file, fatPct: scan.data[0]?.fat_pct ?? null, candidates };
});
