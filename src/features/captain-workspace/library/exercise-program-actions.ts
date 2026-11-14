'use server';

import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { uuidv7 } from '@/core/offline/ids';
import { addExercise, loadProgram, saveProgram } from '@/features/programs';

export async function exercisePrograms() {
  const client = await supabaseServer();
  const auth = await client.auth.getClaims();
  if (auth.error || !auth.data?.claims.sub) throw new Error('session');
  const result = await client.from('programs').select('id,title').eq('captain_id', auth.data.claims.sub)
    .in('status', ['draft', 'active']).order('created_at', { ascending: false });
  if (result.error) throw new Error('programs');
  return result.data;
}

export async function exerciseProgramDays(programId: string) {
  const result = await loadProgram(programId);
  if (!result.data) throw new Error('program');
  return result.data.days.map(day => ({ id: day.id, title: day.title }));
}

export async function addExerciseToProgram(programId: string, dayId: string, exerciseId: string): Promise<boolean> {
  if (![programId, dayId, exerciseId].every(id => z.uuid().safeParse(id).success)) return false;
  try {
    const loaded = await loadProgram(programId);
    if (!loaded.data || !loaded.data.days.some(day => day.id === dayId) || loaded.data.status === 'archived') return false;
    const client = await supabaseServer();
    const exercise = await client.from('exercises').select('*').eq('id', exerciseId).is('archived_at', null).single();
    if (exercise.error || !exercise.data) return false;
    const result = await saveProgram(addExercise(loaded.data, dayId, exercise.data, uuidv7()));
    return result.ok;
  } catch (error) { unstable_rethrow(error); return false; }
}
