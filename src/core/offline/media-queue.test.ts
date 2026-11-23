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
  uploadCheckinPhoto: vi.fn<MediaTransport['uploadCheckinPhoto']>().mockResolvedValue('player/checkin.jpg'),
  insertFormCheck: vi.fn<MediaTransport['insertFormCheck']>().mockResolvedValue(undefined),
});

const checkinRow = (id = 'checkin-1', photoTotal = 2) => ({
  id, week_start: '2026-10-31', body_weight_kg: 75, waist_cm: 90, notes: '',
  photo_paths: Array<string | null>(photoTotal).fill(null),
  body_fat_pct: null, photo_poses: ['front', 'side'].slice(0, photoTotal), photo_total: photoTotal,
});
const photoEntry = (position: number) => ({
  kind: 'checkin_photo' as const, checkin_id: 'checkin-1', position,
  blob: new Blob([position === 0 ? 'a' : 'b'], { type: 'image/jpeg' }), mime: 'image/jpeg',
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
    const existingTables = old.tables.map(table => table.name);
    old.close();
    await db.open();
    expect(db.verno).toBe(10);
    for (const name of existingTables) expect(await db.table(name).count()).toBe(1);
    expect(await db.supplements.count()).toBe(0);
    expect(await db.supplement_logs.count()).toBe(0);
    expect(await db.daily_checks.count()).toBe(0);
    expect(await db.pain_reports.count()).toBe(0);
    expect(await db.check_ins.count()).toBe(0);
    await enqueueMedia(db, entry(), 1000);
    expect(await mediaPending(db)).toBe(1);
  });
});

describe('check-in photos', () => {
  it('uploads photos in position order and queues the row once complete', async () => {
    await db.check_ins.put(checkinRow());
    await enqueueMedia(db, photoEntry(0), 1000);
    await enqueueMedia(db, photoEntry(1), 1000);
    const send = transport();
    send.uploadCheckinPhoto.mockImplementation(async (blob) => `player/photo-${await blob.text()}.jpg`);
    expect(await flushMediaQueue(db, send, 2000)).toEqual({ sent: 2, failed: 0, waiting: 0 });
    expect((await db.check_ins.get('checkin-1'))?.photo_paths).toEqual(['player/photo-a.jpg', 'player/photo-b.jpg']);
    expect(await mediaPending(db)).toBe(0);
    const outbox = await db.outbox.toArray();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ table: 'check_ins', row_id: 'checkin-1' });
    expect(send.upload).not.toHaveBeenCalled();
    expect(send.insertFormCheck).not.toHaveBeenCalled();
  });

  it('waits for the remaining photo before queueing the row', async () => {
    await db.check_ins.put(checkinRow());
    await enqueueMedia(db, photoEntry(0), 1000);
    await enqueueMedia(db, photoEntry(1), 1000);
    const send = transport();
    send.uploadCheckinPhoto.mockImplementation(async (blob) => `player/photo-${await blob.text()}.jpg`);
    send.uploadCheckinPhoto.mockRejectedValueOnce(new Error('offline'));
    expect(await flushMediaQueue(db, send, 2000)).toEqual({ sent: 1, failed: 1, waiting: 0 });
    expect((await db.check_ins.get('checkin-1'))?.photo_paths.filter(Boolean)).toHaveLength(1);
    expect(await db.outbox.count()).toBe(0);
    expect(await db.media_queue.toArray()).toHaveLength(1);
    expect((await db.media_queue.toArray())[0]).toMatchObject({ attempts: 1, next_attempt_at: 4000 });
    expect(await flushMediaQueue(db, send, 4000)).toEqual({ sent: 1, failed: 0, waiting: 0 });
    expect((await db.check_ins.get('checkin-1'))?.photo_paths).toEqual(['player/photo-a.jpg', 'player/photo-b.jpg']);
    expect(await db.outbox.count()).toBe(1);
  });

  it('retries a failed check-in photo upload with backoff', async () => {
    await db.check_ins.put(checkinRow('checkin-1', 1));
    await enqueueMedia(db, photoEntry(0), 1000);
    const send = transport();
    send.uploadCheckinPhoto.mockRejectedValue({ code: '42501', message: 'private/path' });
    await flushMediaQueue(db, send, 1000);
    expect(await flushMediaQueue(db, send, 2999)).toEqual({ sent: 0, failed: 0, waiting: 1 });
    expect(send.uploadCheckinPhoto).toHaveBeenCalledTimes(1);
    await flushMediaQueue(db, send, 3000);
    expect((await db.media_queue.toArray())[0]).toMatchObject({ attempts: 2, next_attempt_at: 7000, last_error: '42501' });
    expect(await db.outbox.count()).toBe(0);
  });

  it('drops a check-in photo whose check-in is gone instead of blocking the queue', async () => {
    await enqueueMedia(db, { ...photoEntry(0), checkin_id: 'missing' }, 1000);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const send = transport();
      expect(await flushMediaQueue(db, send, 1000)).toEqual({ sent: 1, failed: 0, waiting: 0 });
      expect(send.uploadCheckinPhoto).toHaveBeenCalledTimes(1);
      expect(await mediaPending(db)).toBe(0);
      expect(warn).toHaveBeenCalled();
    } finally { warn.mockRestore(); }
  });

  it('uploads check-in photos to the checkin-photos bucket', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const client = fakeClient({ storage: { from: storageFrom } });
    const send = supabaseMediaTransport(client, 'player');
    const path = await send.uploadCheckinPhoto(new Blob(['photo']), 'image/jpeg');
    expect(path).toMatch(/^player\/[0-9a-f-]+\.jpg$/);
    expect(storageFrom).toHaveBeenCalledWith('checkin-photos');
    expect(upload).toHaveBeenCalledWith(path, expect.any(Blob), { contentType: 'image/jpeg', upsert: false });
  });
});
