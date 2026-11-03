import Dexie from 'dexie';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KochivoDB } from './db';
import { enqueueMedia, flushMediaQueue, mediaPending, supabaseMediaTransport, type MediaTransport } from './media-queue';

let db: KochivoDB;
function fakeClient(client: object): SupabaseClient<AppDatabase> {
  // This unit double supplies only the Storage and insert methods exercised by the transport.
  return client as SupabaseClient<AppDatabase>;
}

let sequence = 0;
const entry = (setId: string | null = null) => ({
  kind: 'form_check' as const, blob: new Blob(['video'], { type: 'video/mp4' }),
  mime: 'video/mp4', exercise_id: 'exercise', set_log_id: setId, note: null,
});
const transport = () => ({
  upload: vi.fn<MediaTransport['upload']>().mockResolvedValue('player/video.mp4'),
  insertFormCheck: vi.fn<MediaTransport['insertFormCheck']>().mockResolvedValue(undefined),
});

beforeEach(() => { db = new KochivoDB(`media-test-${sequence++}`); });
afterEach(async () => { await db.delete(); });

describe('media queue', () => {
  it('waits for the server set log even when its outbox retry is not due', async () => {
    await db.outbox.add({ table: 'set_logs', row_id: 'set', revision: 1,
      enqueued_at: 0, attempts: 1, next_attempt_at: 9000 });
    await enqueueMedia(db, entry('set'), 1000);
    const send = transport();
    expect(await flushMediaQueue(db, send, 1000)).toEqual({ sent: 0, failed: 0, waiting: 1 });
    expect(send.upload).not.toHaveBeenCalled();
    expect((await db.media_queue.toArray())[0]?.attempts).toBe(0);
    await db.outbox.clear();
    expect(await flushMediaQueue(db, send, 1000)).toEqual({ sent: 1, failed: 0, waiting: 0 });
    expect(send.insertFormCheck).toHaveBeenCalledWith(expect.objectContaining({ set_log_id: 'set' }));
  });

  it('persists the upload before insertion and reuses it after reopening the database', async () => {
    await enqueueMedia(db, entry(), 1000);
    const send = transport();
    send.insertFormCheck.mockImplementationOnce(async () => {
      expect((await db.media_queue.toArray())[0]?.video_path).toBe('player/video.mp4');
      throw new Error('private/path and note');
    });
    expect(await flushMediaQueue(db, send, 1000)).toEqual({ sent: 0, failed: 1, waiting: 0 });
    expect((await db.media_queue.toArray())[0]).toMatchObject({ attempts: 1, next_attempt_at: 3000, last_error: 'media_failed' });
    db.close();
    await db.open();
    expect(await flushMediaQueue(db, send, 3000)).toEqual({ sent: 1, failed: 0, waiting: 0 });
    expect(send.upload).toHaveBeenCalledTimes(1);
    expect(await mediaPending(db)).toBe(0);
    // Both attempts carry the same row id, so a lost response cannot create a second form check.
    const ids = send.insertFormCheck.mock.calls.map(([row]) => row.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toMatch(/^[0-9a-f-]{14}7[0-9a-f-]+$/);
    expect(ids[1]).toBe(ids[0]);
  });

  it('uses exponential backoff and skips future retries', async () => {
    await enqueueMedia(db, entry(), 1000);
    const send = transport();
    send.upload.mockRejectedValue({ code: '42501', message: 'private/path' });
    await flushMediaQueue(db, send, 1000);
    expect(await flushMediaQueue(db, send, 2999)).toEqual({ sent: 0, failed: 0, waiting: 1 });
    expect(send.upload).toHaveBeenCalledTimes(1);
    await flushMediaQueue(db, send, 3000);
    expect((await db.media_queue.toArray())[0]).toMatchObject({ attempts: 2, next_attempt_at: 7000, last_error: '42501' });
  });

  it.each([{ code: '23505' }, new Error('duplicate key value'), { message: 'duplicate key value' }, 'duplicate'])('treats a duplicate insert as done: %j', async (error) => {
    await enqueueMedia(db, entry(), 1000);
    const send = transport();
    send.insertFormCheck.mockRejectedValue(error);
    expect(await flushMediaQueue(db, send, 1000)).toEqual({ sent: 1, failed: 0, waiting: 0 });
    expect(await mediaPending(db)).toBe(0);
  });

  it('processes due entries oldest first and continues after a failed upload', async () => {
    await enqueueMedia(db, { ...entry(), exercise_id: 'later' }, 2000);
    await enqueueMedia(db, { ...entry(), exercise_id: 'first' }, 1000);
    const send = transport();
    send.upload.mockRejectedValueOnce(new Error('offline'));
    expect(await flushMediaQueue(db, send, 2000)).toEqual({ sent: 1, failed: 1, waiting: 0 });
    expect(send.insertFormCheck).toHaveBeenCalledWith(expect.objectContaining({ exercise_id: 'later' }));
  });

  it('does not discard the entry when the upload reports a duplicate', async () => {
    await enqueueMedia(db, entry(), 1000);
    const send = transport();
    send.upload.mockRejectedValue({ code: '23505' });
    expect(await flushMediaQueue(db, send, 1000)).toEqual({ sent: 0, failed: 1, waiting: 0 });
    expect(await mediaPending(db)).toBe(1);
    expect(send.insertFormCheck).not.toHaveBeenCalled();
  });

  it('uploads to the private player folder and inserts without captain_id', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const from = vi.fn().mockReturnValue({ insert });
    const client = fakeClient({ storage: { from: storageFrom }, from });
    const send = supabaseMediaTransport(client, 'player');
    const path = await send.upload(new Blob(['video']), 'video/quicktime');
    expect(path).toMatch(/^player\/[0-9a-f-]+\.mov$/);
    expect(storageFrom).toHaveBeenCalledWith('form-videos');
    expect(upload).toHaveBeenCalledWith(path, expect.any(Blob), { contentType: 'video/quicktime', upsert: false });
    const row = { id: 'fixed-id', exercise_id: 'exercise', set_log_id: 'set', video_path: path, note: 'note' };
    await send.insertFormCheck(row);
    expect(from).toHaveBeenCalledWith('form_checks');
    expect(insert).toHaveBeenCalledWith(row);
    insert.mockResolvedValue({ error: { code: '23505' } });
    await expect(send.insertFormCheck(row)).rejects.toEqual({ code: '23505' });
  });

  it('upgrades a v3 database without losing any existing tables or rows', async () => {
    const old = new Dexie(db.name);
    old.version(1).stores({ workout_sessions: 'id, training_date',
      set_logs: 'id, session_id, &[session_id+program_exercise_id+set_index]',
      meal_logs: 'id, &[meal_id+log_date]', outbox: '++id, &[table+row_id], next_attempt_at' });
    old.version(2).stores({ program_snapshot: 'id' });
    old.version(3).stores({ nutrition_snapshot: 'id' });
    await old.open();
    for (const table of old.tables) await table.add({ id: table.name === 'outbox' ? 1 : 'saved' });
    old.close();
    await db.open();
    expect(db.verno).toBe(4);
    for (const table of db.tables.filter((table) => table.name !== 'media_queue')) expect(await table.count()).toBe(1);
    await enqueueMedia(db, entry(), 1000);
    expect(await mediaPending(db)).toBe(1);
  });
});
