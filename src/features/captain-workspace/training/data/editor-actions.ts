'use server';
import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { supabaseServer } from '@/core/supabase/server';
import { uuidv7 } from '@/core/offline/ids';
import { getT } from '@/core/i18n/server';
import { fetchRoster } from '@/features/roster';
import type { LibraryExercise } from '@/features/programs';
import { messages } from '../messages';
import { messages as formMessages } from '../../library/messages';
import type { ExerciseName } from '../../library/similar-exercise';

const custom = z.object({ name: z.string().trim().min(1).max(60),
  nameEn: z.string().trim().max(120).default(''),
  bodyPart: z.enum(['chest', 'back', 'upper legs', 'lower legs', 'shoulders', 'upper arms', 'lower arms', 'waist', 'core', 'glutes', 'cardio', 'neck']),
  equipment: z.enum(['', 'barbell', 'dumbbell', 'machine', 'cable', 'body weight', 'kettlebell', 'resistance band', 'treadmill', 'stairmaster']), target: z.string().trim().max(40),
  secondaryMuscles: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
  instructions: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
  video: z.union([z.literal(''), z.url().max(500).refine(value => value.startsWith('https://'))]),
}).refine(value => value.bodyPart === 'cardio' || !['treadmill', 'stairmaster'].includes(value.equipment), { path: ['equipment'] });
const exerciseColumns = 'id,name_ar,name_en,body_part,equipment,media_path,owner_id,target,video_url,secondary_muscles,instructions_ar,archived_at' as const;
const validationMessages = { name: 'nameError', nameEn: 'nameEnError', target: 'targetError',
  secondaryMuscles: 'secondaryError', instructions: 'stepsError', video: 'videoError' } as const;
async function captainClient() {
  const client = await supabaseServer(), claims = await client.auth.getClaims();
  const owner = claims.data?.claims.sub;
  if (claims.error || !owner) throw new Error('session');
  const profile = await client.from('profiles').select('role,suspended_at').eq('id', owner).single();
  if (profile.error || profile.data.role !== 'captain' || profile.data.suspended_at) throw new Error('captain');
  return { client, owner };
}
export async function saveCustom(input: unknown, id?: string): Promise<{ data: LibraryExercise; error?: never } | { error: string; fields?: Record<string, string>; data?: never }> {
  const t = await getT(formMessages), parsed = custom.safeParse(input);
  if (!parsed.success) return { error: t('invalidForm'), fields: Object.fromEntries(parsed.error.issues.map(issue => {
    const key = String(issue.path[0]);
    return [key, t(key in validationMessages ? validationMessages[key as keyof typeof validationMessages] : 'invalidField')];
  })) };
  if (id !== undefined && !z.uuid().safeParse(id).success) return { error: t('saveError') };
  try {
    const { client, owner: captain } = await captainClient();
    const value = parsed.data;
    const row = {
      name_ar: value.name, name_en: value.nameEn || value.name, body_part: value.bodyPart,
      equipment: value.equipment || null, secondary_muscles: value.secondaryMuscles, instructions_ar: value.instructions,
      target: value.target || null, video_url: value.video || null,
    };
    const request = id ? client.from('exercises').update(row).eq('id', id).eq('owner_id', captain)
      : client.from('exercises').insert({ ...row, id: uuidv7(), owner_id: captain });
    const result = await request.select(exerciseColumns).single();
    return result.error ? { error: t('saveError') } : { data: { ...result.data, is_own: true } };
  } catch (error) { unstable_rethrow(error); return { error: t('saveError') }; }
}
export async function loadExerciseForm(id?: string): Promise<{
  data: { exercise: LibraryExercise | null; names: ExerciseName[] }; error?: never;
} | { error: string; data?: never }> {
  const t = await getT(formMessages);
  if (id !== undefined && !z.uuid().safeParse(id).success) return { error: t('error') };
  try {
    const { client, owner } = await captainClient();
    let exercise: LibraryExercise | null = null;
    if (id) {
      const result = await client.from('exercises').select(exerciseColumns).eq('id', id).eq('owner_id', owner).is('archived_at', null).single();
      if (result.error || !result.data) return { error: t('error') };
      exercise = { ...result.data, is_own: true };
    }
    const names: ExerciseName[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await client.from('exercises').select('id,name_ar,name_en').is('archived_at', null).order('id').range(offset, offset + 499);
      if (result.error) return { error: t('error') };
      names.push(...result.data);
      if (result.data.length < 500) break;
    }
    return { data: { exercise, names } };
  } catch (error) { unstable_rethrow(error); return { error: t('error') }; }
}
export async function loadLibraryExercise(id: string) {
  const t = await getT(formMessages);
  if (!z.uuid().safeParse(id).success) return { error: t('error') };
  try {
    const { client, owner } = await captainClient();
    const result = await client.from('exercises').select(exerciseColumns).eq('id', id).is('archived_at', null).single();
    return result.error || !result.data ? { error: t('error') } : { data: { ...result.data, is_own: result.data.owner_id === owner } };
  } catch (error) { unstable_rethrow(error); return { error: t('error') }; }
}
export async function removeCustom(id: string) {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) return { error: t('error') };
  try {
    const { client, owner } = await captainClient();
    const result = await client.from('exercises').delete().eq('id', id).eq('owner_id', owner).select('id').single();
    if (result.error?.code === '23503') {
      const archived = await client.from('exercises').update({ archived_at: new Date().toISOString() }).eq('id', id).eq('owner_id', owner).select('id').single();
      return archived.error ? { error: t('error') } : { data: true };
    }
    return result.error ? { error: t('error') } : { data: true };
  } catch (error) { unstable_rethrow(error); return { error: t('error') }; }
}
export async function loadAssignmentPlayers() {
  const t = await getT(messages);
  const result = await fetchRoster();
  if (result.error !== undefined) throw new Error(t('error'));
  return result.players;
}
export async function assignProgram(templateId: string, playerId: string) {
  const t = await getT(messages);
  if (!z.uuid().safeParse(templateId).success || !z.uuid().safeParse(playerId).success) return { error: t('error') };
  try {
    const client = await supabaseServer();
    const result = await client.rpc('assign_program_template', { p_template: templateId, p_player: playerId });
    return result.error || !result.data ? { error: t('error') } : { data: result.data };
  } catch (error) { unstable_rethrow(error); return { error: t('error') }; }
}
