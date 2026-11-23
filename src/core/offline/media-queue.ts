import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadPrivateMedia } from '@/core/storage/private-media';
import type { AppDatabase } from '@/types/app-database';
import { backoffDelay } from './backoff';
import type { KochivoDB, MediaQueueEntry } from './db';
import { uuidv7 } from './ids';
import { saveAndQueue } from './outbox';

type FormCheckInput = {
  kind: 'form_check'; blob: Blob; mime: string; exercise_id: string; set_log_id: string | null; note: string | null;
};
type CheckinPhotoInput = {
  kind: 'checkin_photo'; blob: Blob; mime: string; checkin_id: string; position: number;
};
export type MediaInput = FormCheckInput | CheckinPhotoInput;
type FormCheckRow = { id: string; video_path: string; exercise_id: string; set_log_id: string | null; note: string | null };

export interface MediaTransport {
  upload(blob: Blob, mime: string): Promise<string>;
  uploadCheckinPhoto(blob: Blob, mime: string): Promise<string>;
  insertFormCheck(row: FormCheckRow): Promise<void>;
}

export function enqueueMedia(db: KochivoDB, entry: MediaInput, now: number = Date.now()): Promise<number> {
  if (entry.kind === 'checkin_photo') {
    return db.media_queue.add({ ...entry, set_log_id: null, note: null, created_at: now, attempts: 0, next_attempt_at: now });
  }
  return db.media_queue.add({ ...entry, form_check_id: uuidv7(), created_at: now, attempts: 0, next_attempt_at: now });
}

export function mediaPending(db: KochivoDB): Promise<number> {
  return db.media_queue.count();
}

function duplicate(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return true;
  const message = typeof error === 'string' ? error :
    typeof error === 'object' && error !== null && 'message' in error ? error.message : '';
  return typeof message === 'string' && /\bduplicate\b/i.test(message);
}

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error &&
    typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code)) return error.code;
  return 'media_failed';
}

export async function flushMediaQueue(db: KochivoDB, transport: MediaTransport, now: number = Date.now()) {
  const entries = await db.media_queue.where('next_attempt_at').belowOrEqual(now).sortBy('created_at');
  const result = { sent: 0, failed: 0, waiting: await mediaPending(db) - entries.length };
  for (const entry of entries) {
    if (entry.id === undefined) continue;
    try {
      if (entry.set_log_id && await db.outbox.where('[table+row_id]').equals(['set_logs', entry.set_log_id]).count()) {
        result.waiting++;
        continue;
      }
      if (entry.kind === 'checkin_photo') await flushCheckinPhoto(db, transport, entry);
      else await flushFormCheck(db, transport, entry);
      result.sent++;
    } catch (error) {
      result.failed++;
      await db.media_queue.update(entry.id, { attempts: entry.attempts + 1,
        next_attempt_at: now + backoffDelay(entry.attempts + 1), last_error: errorCode(error) });
    }
  }
  return result;
}

async function flushFormCheck(db: KochivoDB, transport: MediaTransport, entry: MediaQueueEntry): Promise<void> {
  const entryId = entry.id;
  const formCheckId = entry.form_check_id;
  const exerciseId = entry.exercise_id;
  if (entryId === undefined || formCheckId === undefined || exerciseId === undefined) {
    if (entryId !== undefined) await db.media_queue.delete(entryId);
    console.warn('Dropping form-check entry without a form-check id');
    return;
  }
  let path = entry.video_path;
  if (!path) {
    path = await transport.upload(entry.blob, entry.mime);
    await db.media_queue.update(entryId, { video_path: path });
  }
  try {
    await transport.insertFormCheck({ id: formCheckId, exercise_id: exerciseId, set_log_id: entry.set_log_id,
      video_path: path, note: entry.note });
  } catch (error) {
    if (!duplicate(error)) throw error;
  }
  await db.media_queue.delete(entryId);
}

/**
 * Uploads one check-in photo, patches its slot in the local row, and queues the row only
 * once every photo is uploaded: the row can never be updated on the server afterwards,
 * so it must not sync with placeholder paths. A photo whose check-in is gone is dropped
 * instead of blocking the queue.
 */
async function flushCheckinPhoto(db: KochivoDB, transport: MediaTransport, entry: MediaQueueEntry): Promise<void> {
  const entryId = entry.id;
  const checkinId = entry.checkin_id;
  const position = entry.position;
  if (entryId === undefined || checkinId === undefined || position === undefined) {
    if (entryId !== undefined) await db.media_queue.delete(entryId);
    console.warn('Dropping check-in photo without a check-in');
    return;
  }
  let path = entry.video_path;
  if (!path) {
    path = await transport.uploadCheckinPhoto(entry.blob, entry.mime);
    await db.media_queue.update(entryId, { video_path: path });
  }
  const row = await db.check_ins.get(checkinId);
  if (!row) {
    await db.media_queue.delete(entryId);
    console.warn('Dropping check-in photo without a check-in', checkinId);
    return;
  }
  const photoPaths = [...row.photo_paths];
  photoPaths[position] = path;
  await db.check_ins.update(checkinId, { photo_paths: photoPaths });
  await db.media_queue.delete(entryId);
  const fresh = await db.check_ins.get(checkinId);
  if (!fresh) return;
  const remaining = await db.media_queue.filter((other) => other.checkin_id === checkinId).count();
  const uploaded = fresh.photo_paths.filter((photo): photo is string => photo !== null).length;
  if (remaining === 0 && uploaded === fresh.photo_total) {
    await saveAndQueue(db, 'check_ins', { ...fresh,
      photo_paths: fresh.photo_paths.filter((photo): photo is string => photo !== null) });
  }
}

export function supabaseMediaTransport(client: SupabaseClient<AppDatabase>, playerId: string): MediaTransport {
  return {
    upload: (blob, mime) => uploadPrivateMedia(client, 'form-videos', playerId, blob.slice(0, blob.size, mime)),
    uploadCheckinPhoto: (blob, mime) => uploadPrivateMedia(client, 'checkin-photos', playerId, blob.slice(0, blob.size, mime)),
    async insertFormCheck(row) {
      const { error } = await client.from('form_checks').insert(row);
      if (error) throw error;
    },
  };
}
