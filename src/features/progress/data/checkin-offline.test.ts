import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { enqueueMedia, flushMediaQueue, flushOutbox, localDb, setLocalUser, stableId,
  type KochivoDB, type MediaTransport } from '@/core/offline';
import type { CheckInRow } from '@/core/offline/tables';
import { submitCheckIn, type CheckInInput } from './checkins';

let sequence = 0;
let db: KochivoDB | undefined;

function mockClient(user: string) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: user } }, error: null }) },
    from: vi.fn(() => ({ insert })),
  };
  return { client: client as unknown as SupabaseClient<AppDatabase>, insert };
}

function photoTransport(): MediaTransport {
  return {
    upload: vi.fn<MediaTransport['upload']>().mockResolvedValue('player/video.mp4'),
    uploadCheckinPhoto: vi.fn<MediaTransport['uploadCheckinPhoto']>()
      .mockImplementation(async (blob: Blob) => `player/photo-${await blob.text()}.jpg`),
    insertFormCheck: vi.fn<MediaTransport['insertFormCheck']>().mockResolvedValue(undefined),
  };
}

async function openDb(): Promise<{ local: KochivoDB; user: string }> {
  const user = `checkin-offline-${sequence++}`;
  await setLocalUser(user);
  db = localDb();
  return { local: db, user };
}

beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: false });
  vi.stubGlobal('createImageBitmap', undefined);
});
afterEach(async () => {
  vi.unstubAllGlobals();
  if (db) { await setLocalUser(null); await db.delete(); db = undefined; }
});

describe('check-in offline queue', () => {
  it('queues an offline submit with photos without touching the server', async () => {
    const { local, user } = await openDb();
    const { client, insert } = mockClient(user);
    const result = await submitCheckIn(client, {
      today: '2026-11-03', body_weight_kg: 75, waist_cm: 90, notes: 'تمام',
      photos: [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })],
      body_fat_pct: 18.5, photo_poses: ['front', 'side'],
    });
    expect(result).toEqual({ error: null, status: 'queued' });
    expect(insert).not.toHaveBeenCalled();
    const id = await stableId('checkin', user, '2026-10-31');
    expect(await local.check_ins.get(id)).toMatchObject({
      week_start: '2026-10-31', body_weight_kg: 75, photo_total: 2, photo_poses: ['front', 'side'],
    });
    expect((await local.check_ins.get(id))?.photo_paths).toEqual([null, null]);
    expect(await local.outbox.count()).toBe(0);
    const media = await local.media_queue.toArray();
    expect(media.map((entry) => [entry.kind, entry.checkin_id, entry.position])).toEqual([
      ['checkin_photo', id, 0], ['checkin_photo', id, 1],
    ]);
  });

  it('keeps a failed row flush queued and sends it on retry', async () => {
    const { local, user } = await openDb();
    const { client } = mockClient(user);
    expect(await submitCheckIn(client, {
      today: '2026-11-03', body_weight_kg: 75, waist_cm: null, notes: '', photos: [],
    })).toEqual({ error: null, status: 'queued' });
    expect(await local.outbox.count()).toBe(1);
    const now = Date.now();
    expect(await flushOutbox(local, async () => { throw new Error('offline'); }, now)).toEqual({ sent: 0, failed: 1 });
    expect(await local.outbox.count()).toBe(1);
    const sent: CheckInRow[] = [];
    expect(await flushOutbox(local, async (_table, rows) => { sent.push(...(rows as CheckInRow[])); }, now + 2000))
      .toEqual({ sent: 1, failed: 0 });
    expect(await local.outbox.count()).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ week_start: '2026-10-31', photo_paths: [] });
  });

  it('returns already-sent when the week is re-submitted after sync', async () => {
    const { local, user } = await openDb();
    const { client, insert } = mockClient(user);
    const input: CheckInInput = { today: '2026-11-03', body_weight_kg: 75, waist_cm: null, notes: '', photos: [] };
    expect(await submitCheckIn(client, input)).toEqual({ error: null, status: 'queued' });
    expect(await flushOutbox(local, async () => undefined, Date.now())).toEqual({ sent: 1, failed: 0 });
    expect(await submitCheckIn(client, { ...input, body_weight_kg: 76 }))
      .toEqual({ error: 'بعتّ تحديث الأسبوع ده خلاص', status: 'already-sent' });
    expect(insert).not.toHaveBeenCalled();
    expect(await local.outbox.count()).toBe(0);
    expect(await local.check_ins.count()).toBe(1);
  });

  it('uploads photos on flush, queues the row with the paths in order, then syncs them', async () => {
    const { local, user } = await openDb();
    const { client } = mockClient(user);
    await submitCheckIn(client, {
      today: '2026-11-03', body_weight_kg: 75, waist_cm: 90, notes: '',
      photos: [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.jpg', { type: 'image/jpeg' })],
      photo_poses: ['front', 'side'],
    });
    expect(await flushMediaQueue(local, photoTransport(), Date.now())).toEqual({ sent: 2, failed: 0, waiting: 0 });
    const id = await stableId('checkin', user, '2026-10-31');
    expect((await local.check_ins.get(id))?.photo_paths).toEqual(['player/photo-a.jpg', 'player/photo-b.jpg']);
    const payloads: CheckInRow[][] = [];
    expect(await flushOutbox(local, async (_table, rows) => { payloads.push(rows as CheckInRow[]); }, Date.now()))
      .toEqual({ sent: 1, failed: 0 });
    expect(payloads).toHaveLength(1);
    expect(payloads[0]?.[0]).toMatchObject({
      id, photo_paths: ['player/photo-a.jpg', 'player/photo-b.jpg'], photo_poses: ['front', 'side'],
    });
  });

  it('does not queue the row while photos are still uploading', async () => {
    const { local, user } = await openDb();
    const id = await stableId('checkin', user, '2026-10-31');
    // A flush that lands after the row was written but before every photo was enqueued.
    await local.check_ins.put({ id, week_start: '2026-10-31', body_weight_kg: 75, waist_cm: 90, notes: '',
      photo_paths: [null, null], body_fat_pct: null, photo_poses: ['front', 'side'], photo_total: 2 });
    await enqueueMedia(local, { kind: 'checkin_photo', checkin_id: id, position: 0,
      blob: new Blob(['a'], { type: 'image/jpeg' }), mime: 'image/jpeg' }, Date.now());
    const send = photoTransport();
    expect(await flushMediaQueue(local, send, Date.now())).toEqual({ sent: 1, failed: 0, waiting: 0 });
    expect((await local.check_ins.get(id))?.photo_paths).toEqual(['player/photo-a.jpg', null]);
    expect(await local.outbox.count()).toBe(0);
    await enqueueMedia(local, { kind: 'checkin_photo', checkin_id: id, position: 1,
      blob: new Blob(['b'], { type: 'image/jpeg' }), mime: 'image/jpeg' }, Date.now());
    expect(await flushMediaQueue(local, send, Date.now())).toEqual({ sent: 1, failed: 0, waiting: 0 });
    expect((await local.check_ins.get(id))?.photo_paths).toEqual(['player/photo-a.jpg', 'player/photo-b.jpg']);
    expect(await local.outbox.count()).toBe(1);
  });
});
