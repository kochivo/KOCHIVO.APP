'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { uuidv7 } from '@/core/offline';
import { uploadPrivateMedia } from '@/core/storage';
import type { Database } from '@/types/database';
import { compressImage } from '../image';
import { weekStart } from '../week';

export type CheckIn = {
  id: string;
  player_id: string;
  week_start: string;
  body_weight_kg: number | null;
  waist_cm: number | null;
  notes: string | null;
  photo_paths: string[];
};
export interface CheckInInput {
  today: string;
  body_weight_kg: number;
  waist_cm: number | null;
  notes: string;
  photos: File[];
  onProgress?: (completed: number, total: number) => void;
}
interface CheckInDatabase {
  public: {
    Tables: { check_ins: {
      Row: CheckIn;
      Insert: CheckIn;
      Update: never;
      Relationships: [];
    } };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

async function playerId(client: SupabaseClient<Database>) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('سجّل دخولك تاني');
  return data.user.id;
}

export async function listCheckIns(client: SupabaseClient<Database>): Promise<CheckIn[]> {
  const id = await playerId(client);
  const reader = client as unknown as SupabaseClient<CheckInDatabase>;
  const { data, error } = await reader.from('check_ins')
    .select('id,player_id,week_start,body_weight_kg,waist_cm,notes,photo_paths')
    .eq('player_id', id).order('week_start', { ascending: false }).limit(26);
  if (error) throw new Error('مش قادرين نحمّل تحديثاتك');
  return data ?? [];
}

export async function submitCheckIn(client: SupabaseClient<Database>, input: CheckInInput): Promise<{ error: string | null }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { error: 'محتاج نت عشان تبعت الصور' };
  if (!Number.isFinite(input.body_weight_kg) || input.body_weight_kg < 20 || input.body_weight_kg > 400 ||
    (input.waist_cm !== null && (!Number.isFinite(input.waist_cm) || input.waist_cm < 30 || input.waist_cm > 300)) ||
    input.notes.length > 1000 || input.photos.length > 3) return { error: 'راجع الوزن والمقاسات والصور' };
  try {
    const id = await playerId(client);
    const paths: string[] = [];
    for (const file of input.photos) {
      const blob = await compressImage(file);
      paths.push(await uploadPrivateMedia(client, 'checkin-photos', id, blob));
      input.onProgress?.(paths.length, input.photos.length + 1);
    }
    const writer = client as unknown as SupabaseClient<CheckInDatabase>;
    const { error } = await writer.from('check_ins').insert({
      id: uuidv7(), player_id: id, week_start: weekStart(input.today),
      body_weight_kg: input.body_weight_kg, waist_cm: input.waist_cm,
      notes: input.notes, photo_paths: paths,
    });
    if (error?.code === '23505') return { error: 'بعتّ تحديث الأسبوع ده خلاص' };
    if (error) return { error: 'التحديث متبعتش. جرّب تاني' };
    input.onProgress?.(input.photos.length + 1, input.photos.length + 1);
    return { error: null };
  } catch {
    return { error: typeof navigator !== 'undefined' && !navigator.onLine ?
      'محتاج نت عشان تبعت الصور' : 'التحديث متبعتش. راجع الصور والنت وجرّب تاني' };
  }
}
