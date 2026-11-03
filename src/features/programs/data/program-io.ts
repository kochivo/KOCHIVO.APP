'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import { uuidv7 } from '@/core/offline/ids';
import type { DraftDay, ExerciseRow, ProgramDraft, ProgramRow, ProgramsDatabase, Result } from '../types';

const exerciseSchema = z.object({
  id: z.uuid(), day_id: z.uuid(), exercise_id: z.uuid(), position: z.number().int().positive().max(32767),
  superset_group: z.number().int().positive().max(32767).nullable(),
  sets: z.number().int().min(1).max(20), reps_min: z.number().int().min(1).max(100),
  reps_max: z.number().int().min(1).max(32767).nullable(),
  rest_seconds: z.number().int().min(0).max(900).multipleOf(15),
}).refine(row => row.reps_max === null || row.reps_max >= row.reps_min);
const draftSchema = z.object({
  id: z.uuid(), player_id: z.uuid(), title: z.string().trim().min(1).max(80),
  days: z.array(z.object({ id: z.uuid(), program_id: z.uuid(), title: z.string().max(60),
    position: z.number().int().positive().max(32767), exercises: z.array(exerciseSchema) })),
});
const failure = 'البرنامج متحفظش بالكامل. جرّب الحفظ تاني';
async function session() {
  const client = await supabaseServer() as unknown as SupabaseClient<ProgramsDatabase>;
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub) throw new Error('session');
  return { client, captain: data.claims.sub };
}
export async function loadProgram(id: string): Promise<Result<ProgramDraft>> {
  if (!z.uuid().safeParse(id).success) return { error: 'البرنامج مش موجود' };
  try {
    const { client, captain } = await session();
    const program = await client.from('programs').select('*').eq('id', id).eq('captain_id', captain).single();
    if (program.error) return { error: 'مش قادرين نفتح البرنامج. جرّب تاني' };
    const days = await client.from('program_days').select('*').eq('program_id', id).order('position');
    if (days.error) return { error: 'الأيام متحمّلتش. جرّب تاني' };
    const draftDays: DraftDay[] = [];
    for (const day of days.data) {
      const rows = await client.from('program_exercises').select('*').eq('day_id', day.id).order('position');
      if (rows.error) return { error: 'التمارين متحمّلتش. جرّب تاني' };
      const ids = rows.data.map(row => row.exercise_id);
      const library = ids.length ? await client.from('exercises').select('*').in('id', ids) : { data: [], error: null };
      if (library.error) return { error: 'مكتبة التمارين متحمّلتش. جرّب تاني' };
      draftDays.push({ ...day, exercises: rows.data.map(row => ({ ...row, library: library.data?.find(e => e.id === row.exercise_id) ?? null })) });
    }
    return { data: { ...program.data, days: draftDays } };
  } catch { return { error: 'مش قادرين نفتح البرنامج. جرّب تاني' }; }
}
export async function saveProgram(draft: ProgramDraft): Promise<Result<true>> {
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) return { error: 'راجع اسم البرنامج وأرقام التمارين' };
  const input = parsed.data;
  const dayIds = input.days.map(day => day.id);
  const rows = input.days.flatMap(day => day.exercises);
  if (new Set(dayIds).size !== dayIds.length || new Set(rows.map(row => row.id)).size !== rows.length ||
    input.days.some((day, i) => day.program_id !== input.id || day.position !== i + 1 ||
      day.exercises.some((row, j) => row.day_id !== day.id || row.position !== j + 1))) return { error: 'ترتيب البرنامج مش مظبوط' };
  try {
    const { client, captain } = await session();
    const existing = await client.from('programs').select('*').eq('id', input.id).eq('captain_id', captain).single();
    if (existing.error || existing.data.player_id !== input.player_id) return { error: 'البرنامج مش متاح للتعديل' };
    const oldDays = await client.from('program_days').select('*').eq('program_id', input.id);
    if (oldDays.error) return { error: failure };
    // A captain may own many programs: IDs must not move rows out of another program.
    if (dayIds.length) {
      const claimed = await client.from('program_days').select('*').in('id', dayIds);
      if (claimed.error || claimed.data.some(day => day.program_id !== input.id)) return { error: 'اليوم تابع لبرنامج تاني' };
    }
    if (rows.length) {
      const claimed = await client.from('program_exercises').select('*').in('id', rows.map(row => row.id));
      if (claimed.error || claimed.data.some(row => !oldDays.data.some(day => day.id === row.day_id))) return { error: 'التمرين تابع لبرنامج تاني' };
    }
    const program = await client.from('programs').upsert({ id: input.id, captain_id: captain,
      player_id: input.player_id, is_template: false, title: input.title });
    if (program.error) return { error: failure };
    const oldIds = oldDays.data.map(day => day.id);
    if (oldIds.length) {
      const oldRows = await client.from('program_exercises').select('*').in('day_id', oldIds);
      if (oldRows.error) return { error: failure };
      const removed = oldRows.data.filter(row => !rows.some(next => next.id === row.id)).map(row => row.id);
      if (removed.length && (await client.from('program_exercises').delete().in('id', removed)).error) return { error: failure };
    }
    const removedDays = oldIds.filter(id => !dayIds.includes(id));
    if (removedDays.length && (await client.from('program_days').delete().in('id', removedDays)).error) return { error: failure };
    if (input.days.length) {
      const days = input.days.map(day => ({ id: day.id, program_id: day.program_id, title: day.title, position: day.position }));
      if ((await client.from('program_days').upsert(days)).error) return { error: failure };
    }
    if (rows.length && (await client.from('program_exercises').upsert(rows satisfies ExerciseRow[])).error) return { error: failure };
    return { data: true };
  } catch { return { error: failure }; }
}
export async function createProgram(playerId: string, title: string): Promise<Result<string>> {
  if (!z.uuid().safeParse(playerId).success || !title.trim() || title.trim().length > 80) return { error: 'راجع اللاعب واسم البرنامج' };
  try {
    const { client, captain } = await session();
    const id = uuidv7();
    const result = await client.from('programs').insert({ id, captain_id: captain, player_id: playerId, title: title.trim(), is_template: false, status: 'draft' });
    return result.error ? { error: 'البرنامج متعملش. جرّب تاني' } : { data: id };
  } catch { return { error: 'البرنامج متعملش. جرّب تاني' }; }
}
export async function listPlayerPrograms(playerId: string): Promise<Result<ProgramRow[]>> {
  if (!z.uuid().safeParse(playerId).success) return { error: 'اللاعب مش موجود' };
  try {
    const { client, captain } = await session();
    const result = await client.from('programs').select('*').eq('player_id', playerId).eq('captain_id', captain).order('created_at', { ascending: false });
    return result.error ? { error: 'البرامج متحمّلتش. جرّب تاني' } : { data: result.data };
  } catch { return { error: 'البرامج متحمّلتش. جرّب تاني' }; }
}
