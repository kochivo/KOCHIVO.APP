'use client';
import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import type { Translator } from '@/core/i18n/messages';

import type { SupabaseClient } from '@supabase/supabase-js';
import { enqueueMedia, localDb, saveAndQueue, stableId, uuidv7, type KochivoDB } from '@/core/offline';
import type { CheckInRow } from '@/core/offline/tables';
import { uploadPrivateMedia } from '@/core/storage';
import type { Tables } from '@/types/database';
import type { AppDatabase } from '@/types/app-database';
import { compressImage } from '../image';
import { weekStart } from '../week';

export type CheckIn = Pick<Tables<'check_ins'>,
  'id' | 'player_id' | 'week_start' | 'body_weight_kg' | 'waist_cm' | 'notes' | 'photo_paths' | 'captain_reply' | 'reviewed_at' | 'body_fat_pct' | 'photo_poses'> & { pending?: boolean };
export interface CheckInInput {
  today: string;
  body_weight_kg: number;
  waist_cm: number | null;
  notes: string;
  photos: File[];
  body_fat_pct?: number | null;
  photo_poses?: string[];
  onProgress?: (completed: number, total: number) => void;
}
export type SubmitResult = { error: string | null; status: 'sent' | 'queued' | 'already-sent' };
async function playerId(client: SupabaseClient<AppDatabase>, t: Translator<typeof messages>) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error(t('signInAgain'));
  return data.user.id;
}

/** The local database is absent before the player shell sets the local user. */
function tryLocalDb(): KochivoDB | null {
  try { return localDb(); } catch { return null; }
}

function invalid(input: CheckInInput): boolean {
  return !Number.isFinite(input.body_weight_kg) || input.body_weight_kg < 20 || input.body_weight_kg > 400 ||
    (input.waist_cm !== null && (!Number.isFinite(input.waist_cm) || input.waist_cm < 30 || input.waist_cm > 300)) ||
    input.notes.length > 1000 || input.photos.length > 3 ||
    (input.body_fat_pct != null && (!Number.isFinite(input.body_fat_pct) || input.body_fat_pct < 3 || input.body_fat_pct > 60)) ||
    (input.photo_poses?.length ? (input.photo_poses.length !== input.photos.length ||
      input.photo_poses.some(pose => !['front', 'side', 'back'].includes(pose))) : false);
}

async function fetchServerCheckIns(client: SupabaseClient<AppDatabase>, t: Translator<typeof messages>): Promise<CheckIn[]> {
  const id = await playerId(client, t);
  const { data, error } = await client.from('check_ins')
    .select('id,player_id,week_start,body_weight_kg,waist_cm,notes,photo_paths,captain_reply,reviewed_at,body_fat_pct,photo_poses')
    .eq('player_id', id).order('week_start', { ascending: false }).limit(26).returns<CheckIn[]>();
  if (error) throw new Error(t('couldntLoadYourCheckins'));
  return data ?? [];
}

/** Local rows still on the device (queued row or photos not yet uploaded), newest first. */
async function pendingCheckIns(db: KochivoDB): Promise<CheckIn[]> {
  const pending: CheckIn[] = [];
  for (const row of await db.check_ins.toArray()) {
    const queued = await db.outbox.where('[table+row_id]').equals(['check_ins', row.id]).count() > 0;
    const media = await db.media_queue.filter((entry) => entry.checkin_id === row.id).count() > 0;
    if (!queued && !media) continue;
    pending.push({
      id: row.id, player_id: db.userId ?? '', week_start: row.week_start,
      body_weight_kg: row.body_weight_kg, waist_cm: row.waist_cm, notes: row.notes,
      photo_paths: row.photo_paths.filter((path): path is string => path !== null),
      captain_reply: null, reviewed_at: null, body_fat_pct: row.body_fat_pct,
      photo_poses: row.photo_poses, pending: true,
    });
  }
  pending.sort((a, b) => b.week_start.localeCompare(a.week_start));
  return pending.slice(0, 26);
}

export async function listCheckIns(client: SupabaseClient<AppDatabase>, t: Translator<typeof messages> = createT(messages, 'ar')): Promise<CheckIn[]> {
  const db = tryLocalDb();
  if (!db) return fetchServerCheckIns(client, t);
  let server: CheckIn[];
  try {
    server = await fetchServerCheckIns(client, t);
  } catch {
    const local = await pendingCheckIns(db);
    if (!local.length) throw new Error(t('couldntLoadYourCheckins'));
    return local;
  }
  const pending = await pendingCheckIns(db);
  const serverWeeks = new Set(server.map((row) => row.week_start));
  const merged = [...server, ...pending.filter((row) => !serverWeeks.has(row.week_start))];
  merged.sort((a, b) => b.week_start.localeCompare(a.week_start));
  return merged.slice(0, 26);
}

export async function submitCheckIn(client: SupabaseClient<AppDatabase>, input: CheckInInput, t: Translator<typeof messages> = createT(messages, 'ar')): Promise<SubmitResult> {
  const db = tryLocalDb();
  if ((!db || !db.userId) && typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { error: t('couldntSendTheCheckinTryAgain'), status: 'queued' };
  }
  if (invalid(input)) return { error: t('checkYourWeightMeasurementsAndPhotos'), status: 'queued' };
  if (!db || !db.userId) return submitOnlineOnly(client, input, t);
  const week = weekStart(input.today);
  const id = await stableId('checkin', db.userId, week);
  const existing = await db.check_ins.get(id);
  if (existing) {
    const queued = await db.outbox.where('[table+row_id]').equals(['check_ins', id]).count() > 0;
    const media = await db.media_queue.filter((entry) => entry.checkin_id === id).count() > 0;
    if (!queued && !media) return { error: t('youveAlreadySentThisWeeksCheckin'), status: 'already-sent' };
  }
  let blobs: Blob[];
  try {
    blobs = [];
    for (const file of input.photos) {
      blobs.push(await compressImage(file, 1600, 0.8, t));
      input.onProgress?.(blobs.length, input.photos.length + 1);
    }
  } catch {
    return { error: t('couldntSendTheCheckinCheckYourPhotos'), status: 'queued' };
  }
  const row: CheckInRow = {
    id, week_start: week,
    body_weight_kg: input.body_weight_kg, waist_cm: input.waist_cm,
    notes: input.notes, photo_paths: blobs.map(() => null),
    body_fat_pct: input.body_fat_pct ?? null, photo_poses: input.photo_poses ?? [],
    photo_total: blobs.length,
  };
  try {
    if (blobs.length === 0) {
      await saveAndQueue(db, 'check_ins', row);
      // A re-send without photos supersedes photos still waiting to upload.
      await db.media_queue.filter((entry) => entry.checkin_id === id).delete();
    } else {
      // One transaction: a crash can never leave a row without its photos or photos without a row.
      await db.transaction('rw', db.check_ins, db.media_queue, async () => {
        await db.check_ins.put(row);
        await db.media_queue.filter((entry) => entry.checkin_id === id).delete();
        for (const [position, blob] of blobs.entries()) {
          await enqueueMedia(db, { kind: 'checkin_photo', checkin_id: id, position, blob, mime: blob.type });
        }
      });
    }
  } catch {
    return { error: t('couldntSendTheCheckinTryAgain'), status: 'queued' };
  }
  input.onProgress?.(input.photos.length + 1, input.photos.length + 1);
  return { error: null, status: 'queued' };
}

/**
 * Fallback for a player shell that has not set the local user yet: the previous
 * online-only behaviour (upload, then direct insert). Never used on the normal path.
 */
async function submitOnlineOnly(client: SupabaseClient<AppDatabase>, input: CheckInInput, t: Translator<typeof messages>): Promise<SubmitResult> {
  try {
    const id = await playerId(client, t);
    const paths: string[] = [];
    for (const file of input.photos) {
      const blob = await compressImage(file, 1600, 0.8, t);
      paths.push(await uploadPrivateMedia(client, 'checkin-photos', id, blob));
      input.onProgress?.(paths.length, input.photos.length + 1);
    }
    const row = {
      id: uuidv7(), player_id: id, week_start: weekStart(input.today),
      body_weight_kg: input.body_weight_kg, waist_cm: input.waist_cm,
      notes: input.notes, photo_paths: paths,
      body_fat_pct: input.body_fat_pct ?? null, photo_poses: input.photo_poses ?? [],
    };
    const { error } = await client.from('check_ins').insert(row);
    if (error?.code === '23505') return { error: t('youveAlreadySentThisWeeksCheckin'), status: 'already-sent' };
    if (error) return { error: t('couldntSendTheCheckinTryAgain'), status: 'queued' };
    input.onProgress?.(input.photos.length + 1, input.photos.length + 1);
    return { error: null, status: 'sent' };
  } catch {
    return { error: typeof navigator !== 'undefined' && !navigator.onLine ?
      t('couldntSendTheCheckinTryAgain') : t('couldntSendTheCheckinCheckYourPhotos'), status: 'queued' };
  }
}
