import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadPrivateMedia } from '@/core/storage/private-media';
import type { AppDatabase } from '@/types/app-database';
import { backoffDelay } from './backoff';
import type { KochivoDB, MediaQueueEntry } from './db';
import { uuidv7 } from './ids';

type MediaInput = Pick<MediaQueueEntry, 'kind' | 'blob' | 'mime' | 'exercise_id' | 'set_log_id' | 'note'>;
type FormCheckRow = Pick<MediaQueueEntry, 'exercise_id' | 'set_log_id' | 'note'> & { id: string; video_path: string };

export interface MediaTransport {
  upload(blob: Blob, mime: string): Promise<string>;
  insertFormCheck(row: FormCheckRow): Promise<void>;
}

export function enqueueMedia(db: KochivoDB, entry: MediaInput, now: number = Date.now()): Promise<number> {
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
      let path = entry.video_path;
      if (!path) {
        path = await transport.upload(entry.blob, entry.mime);
        await db.media_queue.update(entry.id, { video_path: path });
      }
      try {
        await transport.insertFormCheck({ id: entry.form_check_id, exercise_id: entry.exercise_id, set_log_id: entry.set_log_id,
          video_path: path, note: entry.note });
      } catch (error) {
        if (!duplicate(error)) throw error;
      }
      await db.media_queue.delete(entry.id);
      result.sent++;
    } catch (error) {
      result.failed++;
      await db.media_queue.update(entry.id, { attempts: entry.attempts + 1,
        next_attempt_at: now + backoffDelay(entry.attempts + 1), last_error: errorCode(error) });
    }
  }
  return result;
}

export function supabaseMediaTransport(client: SupabaseClient<AppDatabase>, playerId: string): MediaTransport {
  return {
    upload: (blob, mime) => uploadPrivateMedia(client, 'form-videos', playerId, blob.slice(0, blob.size, mime)),
    async insertFormCheck(row) {
      const { error } = await client.from('form_checks').insert(row);
      if (error) throw error;
    },
  };
}
