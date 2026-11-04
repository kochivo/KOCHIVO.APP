'use server';

import { ok, fail } from '@/lib/action-result';
import type { ActionResult } from '@/lib/action-result';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { uuidv7 } from '@/core/offline/ids';
import type { DraftDay, ProgramDraft, ProgramRow, Result } from '../types';
import { convertToWeek } from '../weekly-draft';

const cardioSchema = z.object({ id: z.uuid(), day_id: z.uuid(), position: z.number().int().positive().max(32767),
  kind: z.string().trim().min(1).max(40), minutes: z.number().int().min(1).max(300),
  intensity: z.enum(['low', 'moderate', 'high']), notes: z.string().max(300) });

const exerciseSchema = z.object({
  id: z.uuid(), day_id: z.uuid(), exercise_id: z.uuid(), position: z.number().int().positive().max(32767),
  superset_group: z.number().int().positive().max(32767).nullable(),
  sets: z.number().int().min(1).max(20), reps_min: z.number().int().min(1).max(100),
  reps_max: z.number().int().min(1).max(32767).nullable(),
  rest_seconds: z.number().int().min(0).max(900).multipleOf(15),
}).refine(row => row.reps_max === null || row.reps_max >= row.reps_min);
const draftSchema = z.object({
  id: z.uuid(), player_id: z.uuid().nullable(), title: z.string().trim().min(1).max(80),
  repeatWeekly: z.boolean().optional(),
  days: z.array(z.object({ id: z.uuid(), program_id: z.uuid(), title: z.string().max(60),
    weekday: z.number().int().min(0).max(6).nullable().optional(), is_rest_day: z.boolean().default(false),
    cardio: z.array(cardioSchema).default([]),
    position: z.number().int().positive().max(32767), exercises: z.array(exerciseSchema) })),
});
async function session() {
  const client = await supabaseServer();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims.sub) throw new Error('session');
  return { client, captain: data.claims.sub };
}
export async function loadProgram(id: string): Promise<Result<ProgramDraft>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) return { error: t('programNotFound') };
  try {
    const { client, captain } = await session();
    const program = await client.from('programs').select('*').eq('id', id).eq('captain_id', captain).single();
    if (program.error) return { error: t('couldntOpenTheProgramTryAgain') };
    const days = await client.from('program_days').select('*').eq('program_id', id).order('position');
    if (days.error) return { error: t('couldntLoadDaysTryAgain') };
    const draftDays: DraftDay[] = [];
    for (const day of days.data) {
      const rows = await client.from('program_exercises').select('*').eq('day_id', day.id).order('position');
      if (rows.error) return { error: t('couldntLoadExercisesTryAgain') };
      const cardio = await client.from('program_cardio').select('*').eq('day_id', day.id).order('position');
      const blocks = z.array(cardioSchema).safeParse(cardio.data);
      if (cardio.error || !blocks.success) return { error: t('couldntLoadExercisesTryAgain') };
      const ids = rows.data.map(row => row.exercise_id);
      const library = ids.length ? await client.from('exercises').select('*').in('id', ids) : { data: [], error: null };
      if (library.error) return { error: t('couldntLoadTheExerciseLibraryTryAgain') };
      draftDays.push({ ...day, cardio: blocks.data, exercises: rows.data.map(row => ({ ...row, library: library.data?.find(e => e.id === row.exercise_id) ?? null })) });
    }
    const settings = program.data.settings;
    return { data: { ...program.data, repeatWeekly: typeof settings === 'object' && settings !== null &&
      !Array.isArray(settings) ? settings.repeatWeekly !== false : true, days: draftDays } };
  } catch (error) { unstable_rethrow(error); return { error: t('couldntOpenTheProgramTryAgain') }; }
}
export async function saveProgram(draft: ProgramDraft): Promise<ActionResult<true>> {
  const t = await getT(messages);
  const failure = t('programWasntFullySavedTrySavingAgain');
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) return fail(t('checkTheProgramNameAndExerciseNumbers'));
  const input = parsed.data;
  const dayIds = input.days.map(day => day.id);
  const rows = input.days.flatMap(day => day.exercises);
  const cardio = input.days.flatMap(day => day.cardio);
  const weekdays = input.days.filter(day => day.weekday != null).map(day => day.weekday);
  if (new Set(dayIds).size !== dayIds.length || new Set(rows.map(row => row.id)).size !== rows.length ||
    new Set(cardio.map(row => row.id)).size !== cardio.length || new Set(weekdays).size !== weekdays.length ||
    (weekdays.length > 0 && (weekdays.length !== 7 || input.days.length !== 7)) ||
    input.days.some((day, i) => day.program_id !== input.id || day.position !== i + 1 ||
      (day.is_rest_day && (day.exercises.length > 0 || day.cardio.length > 0)) ||
      day.cardio.some((row, j) => row.day_id !== day.id || row.position !== j + 1) ||
      day.exercises.some((row, j) => row.day_id !== day.id || row.position !== j + 1))) return fail(t('programOrderIsInvalid'));
  try {
    const { client } = await session();
    const result = await client.rpc('save_weekly_program', { p_draft: input });
    return result.error ? fail(failure) : ok(true as const);
  } catch (error) { unstable_rethrow(error); return fail(failure); }
}
export async function createProgram(playerId: string, title: string): Promise<Result<string>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(playerId).success || !title.trim() || title.trim().length > 80) return { error: t('checkThePlayerAndProgramName') };
  try {
    const { client, captain } = await session();
    const id = uuidv7();
    const result = await client.from('programs').insert({ id, captain_id: captain, player_id: playerId, title: title.trim(),
      is_template: false, status: 'draft', settings: { repeatWeekly: true } });
    if (result.error) return { error: t('couldntCreateTheProgramTryAgain') };
    const week = convertToWeek({ id, player_id: playerId, title, status: 'draft', days: [] }, uuidv7);
    const days = await client.from('program_days').insert(week.days.map(day => ({ id: day.id, program_id: id,
      title: day.title, position: day.position, weekday: day.weekday, is_rest_day: true })));
    if (days.error) {
      await client.from('programs').delete().eq('id', id);
      return { error: t('couldntCreateTheProgramTryAgain') };
    }
    return { data: id };
  } catch (error) { unstable_rethrow(error); return { error: t('couldntCreateTheProgramTryAgain') }; }
}
export async function listPlayerPrograms(playerId: string): Promise<Result<ProgramRow[]>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(playerId).success) return { error: t('playerNotFound') };
  try {
    const { client, captain } = await session();
    const result = await client.from('programs').select('*').eq('player_id', playerId).eq('captain_id', captain).order('created_at', { ascending: false });
    return result.error ? { error: t('couldntLoadProgramsTryAgain') } : { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: t('couldntLoadProgramsTryAgain') }; }
}
