'use client';
import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import type { Translator } from '@/core/i18n/messages';

import type { SupabaseClient } from '@supabase/supabase-js';
import { uuidv7 } from '@/core/offline';
import { uploadPrivateMedia } from '@/core/storage';
import type { Tables } from '@/types/database';
import type { AppDatabase } from '@/types/app-database';
import { compressImage } from '../image';
import { weekStart } from '../week';

export type CheckIn = Pick<Tables<'check_ins'>,
  'id' | 'player_id' | 'week_start' | 'body_weight_kg' | 'waist_cm' | 'notes' | 'photo_paths' | 'captain_reply' | 'reviewed_at'>;
export interface CheckInInput {
  today: string;
  body_weight_kg: number;
  waist_cm: number | null;
  notes: string;
  photos: File[];
  onProgress?: (completed: number, total: number) => void;
}
async function playerId(client: SupabaseClient<AppDatabase>, t: Translator<typeof messages>) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error(t('signInAgain'));
  return data.user.id;
}

export async function listCheckIns(client: SupabaseClient<AppDatabase>, t: Translator<typeof messages> = createT(messages, 'ar')): Promise<CheckIn[]> {
  const id = await playerId(client, t);
  const { data, error } = await client.from('check_ins')
    .select('id,player_id,week_start,body_weight_kg,waist_cm,notes,photo_paths,captain_reply,reviewed_at')
    .eq('player_id', id).order('week_start', { ascending: false }).limit(26);
  if (error) throw new Error(t('couldntLoadYourCheckins'));
  return data ?? [];
}

export async function submitCheckIn(client: SupabaseClient<AppDatabase>, input: CheckInInput, t: Translator<typeof messages> = createT(messages, 'ar')): Promise<{ error: string | null }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { error: t('goOnlineToSendPhotos') };
  if (!Number.isFinite(input.body_weight_kg) || input.body_weight_kg < 20 || input.body_weight_kg > 400 ||
    (input.waist_cm !== null && (!Number.isFinite(input.waist_cm) || input.waist_cm < 30 || input.waist_cm > 300)) ||
    input.notes.length > 1000 || input.photos.length > 3) return { error: t('checkYourWeightMeasurementsAndPhotos') };
  try {
    const id = await playerId(client, t);
    const paths: string[] = [];
    for (const file of input.photos) {
      const blob = await compressImage(file, 1600, 0.8, t);
      paths.push(await uploadPrivateMedia(client, 'checkin-photos', id, blob));
      input.onProgress?.(paths.length, input.photos.length + 1);
    }
    const { error } = await client.from('check_ins').insert({
      id: uuidv7(), player_id: id, week_start: weekStart(input.today),
      body_weight_kg: input.body_weight_kg, waist_cm: input.waist_cm,
      notes: input.notes, photo_paths: paths,
    });
    if (error?.code === '23505') return { error: t('youveAlreadySentThisWeeksCheckin') };
    if (error) return { error: t('couldntSendTheCheckinTryAgain') };
    input.onProgress?.(input.photos.length + 1, input.photos.length + 1);
    return { error: null };
  } catch {
    return { error: typeof navigator !== 'undefined' && !navigator.onLine ?
      t('goOnlineToSendPhotos') : t('couldntSendTheCheckinCheckYourPhotos') };
  }
}
