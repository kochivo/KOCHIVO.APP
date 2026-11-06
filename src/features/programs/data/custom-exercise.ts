'use server';

import { z } from 'zod';
import { unstable_rethrow } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import { supabaseServer } from '@/core/supabase/server';
import { uuidv7 } from '@/core/offline/ids';
import { customExerciseSchema } from '../custom-exercises';
import { messages } from '../messages';
import type { LibraryExercise, Result } from '../types';

async function captainClient() {
  const client = await supabaseServer();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('session');
  const owner = auth.data.user.id;
  const profile = await client.from('profiles').select('role,suspended_at').eq('id', owner).single();
  if (profile.error || profile.data.role !== 'captain' || profile.data.suspended_at) throw new Error('captain');
  return { client, owner };
}
async function save(input: unknown, id: string, update: boolean): Promise<Result<LibraryExercise>> {
  const t = await getT(messages);
  const parsed = customExerciseSchema.safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(id).success) return { error: t('invalidCustomExercise') };
  try {
    const { client, owner } = await captainClient();
    const value = parsed.data;
    const row = { name_ar: value.name, name_en: value.name, body_part: value.bodyPart,
      target: value.target || null, video_url: value.videoUrl || null, equipment: value.equipment };
    const request = update ? client.from('exercises').update(row).eq('id', id).eq('owner_id', owner)
      : client.from('exercises').insert({ ...row, id, owner_id: owner });
    const result = await request.select('*').single();
    return result.error ? { error: t('customExerciseSaveFailed') } : { data: { ...result.data, is_own: true } };
  } catch (error) {
    unstable_rethrow(error);
    return { error: t('customExerciseSaveFailed') };
  }
}
export async function createCustomExercise(input: unknown, id = uuidv7()): Promise<Result<LibraryExercise>> {
  return save(input, id, false);
}
export async function updateCustomExercise(id: string, input: unknown): Promise<Result<LibraryExercise>> {
  return save(input, id, true);
}
export async function deleteCustomExercise(id: string): Promise<Result<true | { archived: true }>> {
  const t = await getT(messages);
  if (!z.uuid().safeParse(id).success) return { error: t('invalidCustomExercise') };
  try {
    const { client, owner } = await captainClient();
    const result = await client.from('exercises').delete().eq('id', id).eq('owner_id', owner).select('id').single();
    if (result.error?.code === '23503') {
      const archived = await client.from('exercises').update({ archived_at: new Date().toISOString() })
        .eq('id', id).eq('owner_id', owner).select('id').single();
      return archived.error ? { error: t('customExerciseDeleteFailed') } : { data: { archived: true } };
    }
    if (result.error) return { error: t('customExerciseDeleteFailed') };
    return { data: true };
  } catch (error) {
    unstable_rethrow(error);
    return { error: t('customExerciseDeleteFailed') };
  }
}
