import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { uploadPrivateMedia, signedMediaUrl } from '@/core/storage/private-media';
import { weekStart } from './week';
import { mainLifts, topSets, trendDelta } from './trends';
import { listCheckIns, submitCheckIn } from './data/checkins';
import { compressImage } from './image';
import { localDb } from '@/core/offline';
import type * as Ids from '@/core/offline/ids';
import { readStrength } from './data/strength';

vi.mock('@/core/offline/ids', async (original) => ({
  ...await original<typeof Ids>(),
  uuidv7: () => '0194cc00-0000-7000-8000-000000000001',
}));
afterEach(() => vi.unstubAllGlobals());

function fakeClient(client: object): SupabaseClient<AppDatabase> {
  // This unit double implements only the Auth, Storage and query methods exercised below.
  return client as SupabaseClient<AppDatabase>;
}

function mockClient(code?: string) {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'signed' }, error: null });
  const insert = vi.fn().mockResolvedValue({ error: code ? { code } : null });
  const limit = vi.fn().mockResolvedValue({ data: [], error: null });
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'player' } }, error: null }) },
    storage: { from: vi.fn(() => ({ upload, createSignedUrl })) },
    from: vi.fn(() => ({ insert, select })),
  };
  return { client: fakeClient(client), upload, createSignedUrl, insert, eq, order, limit };
}

describe('Saturday weeks', () => {
  it.each([
    ['2026-10-31', '2026-10-31'], ['2026-10-30', '2026-10-24'],
    ['2026-11-01', '2026-10-31'], ['2026-01-01', '2025-12-27'],
  ])('%s starts %s', (today, expected) => expect(weekStart(today)).toBe(expected));
});

const sets = [
  { exercise_id: 'bench', training_date: '2026-10-01', weight_kg: 50, reps: 8 },
  { exercise_id: 'bench', training_date: '2026-10-01', weight_kg: 50, reps: 10 },
  { exercise_id: 'bench', training_date: '2026-10-01', weight_kg: 45, reps: 12 },
  { exercise_id: 'bench', training_date: '2026-10-29', weight_kg: 60, reps: 6 },
  { exercise_id: 'squat', training_date: '2026-10-01', weight_kg: 80, reps: 5 },
];
it('selects the heaviest set per date, breaking ties by reps, in date order', () => {
  expect(topSets([...sets].reverse(), 'bench')).toEqual([
    { date: '2026-10-01', value: 50, reps: 10 }, { date: '2026-10-29', value: 60, reps: 6 },
  ]);
  expect(topSets(sets, 'missing')).toEqual([]);
});
it('ranks main lifts by logged sets with a deterministic tie break', () => {
  expect(mainLifts(sets)).toEqual(['bench', 'squat']);
  expect(mainLifts(sets, 1)).toEqual(['bench']);
  expect(mainLifts([])).toEqual([]);
});
it('compares to the nearest point at least four weeks older', () => {
  expect(trendDelta([])).toBeNull();
  expect(trendDelta([{ date: '2026-10-01', value: 80 }])).toBeNull();
  expect(trendDelta([{ date: '2026-10-02', value: 80 }, { date: '2026-10-29', value: 78 }])).toBeNull();
  expect(trendDelta([
    { date: '2026-09-24', value: 85 }, { date: '2026-10-01', value: 80 },
    { date: '2026-10-29', value: 78.4 },
  ])).toBeCloseTo(-1.6);
});
it('uses the MIME type for the extension and UUID v7 for the upload path', async () => {
  const { client, upload } = mockClient();
  const file = new File(['photo'], 'wrong.png', { type: 'image/jpeg' });
  const path = await uploadPrivateMedia(client, 'checkin-photos', 'player', file);
  expect(path).toMatch(/^player\/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/);
  expect(upload).toHaveBeenCalledWith(path, file, { contentType: 'image/jpeg', upsert: false });
});
it('signs private URLs for ten minutes', async () => {
  const { client, createSignedUrl } = mockClient();
  expect(await signedMediaUrl(client, 'checkin-photos', 'player/photo.jpg')).toBe('signed');
  expect(createSignedUrl).toHaveBeenCalledWith('player/photo.jpg', 600);
});
it('maps the weekly unique constraint to Arabic', async () => {
  const { client } = mockClient('23505');
  expect(await submitCheckIn(client, {
    today: '2026-11-03', body_weight_kg: 75, waist_cm: null, notes: '', photos: [],
  })).toEqual({ error: 'بعتّ تحديث الأسبوع ده خلاص' });
});
it('uploads before inserting a check-in, using the authenticated player and Saturday', async () => {
  const { client, upload, insert } = mockClient();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('createImageBitmap', undefined);
  const photo = new File(['photo'], 'private.png', { type: 'image/jpeg' });
  expect(await submitCheckIn(client, {
    today: '2026-11-03', body_weight_kg: 75, waist_cm: 90, notes: 'تمام', photos: [photo],
  })).toEqual({ error: null });
  expect(upload.mock.invocationCallOrder[0]).toBeLessThan(insert.mock.invocationCallOrder[0] ?? 0);
  expect(insert).toHaveBeenCalledWith({
    id: '0194cc00-0000-7000-8000-000000000001', notes: 'تمام',
    player_id: 'player', week_start: '2026-10-31', body_weight_kg: 75, waist_cm: 90,
    photo_paths: ['player/0194cc00-0000-7000-8000-000000000001.jpg'],
  });
});
it('lists only the authenticated player, newest first, capped at 26', async () => {
  const { client, eq, order, limit } = mockClient();
  await listCheckIns(client);
  expect(eq).toHaveBeenCalledWith('player_id', 'player');
  expect(order).toHaveBeenCalledWith('week_start', { ascending: false });
  expect(limit).toHaveBeenCalledWith(26);
});
it('blocks offline submissions before upload or insert', async () => {
  const { client, upload, insert } = mockClient();
  vi.stubGlobal('navigator', { onLine: false });
  expect(await submitCheckIn(client, {
    today: '2026-11-03', body_weight_kg: 75, waist_cm: null, notes: '', photos: [],
  })).toEqual({ error: 'محتاج نت عشان تبعت الصور' });
  expect(upload).not.toHaveBeenCalled();
  expect(insert).not.toHaveBeenCalled();
});
it('falls back to the original supported image only within 5 MB', async () => {
  vi.stubGlobal('createImageBitmap', undefined);
  const small = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
  expect(await compressImage(small)).toBe(small);
  const large = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' });
  await expect(compressImage(large)).rejects.toThrow('الصورة');
});
it('scales images down without upscaling and releases the bitmap', async () => {
  const close = vi.fn();
  const drawImage = vi.fn();
  const encoded = new Blob(['compressed'], { type: 'image/jpeg' });
  const convertToBlob = vi.fn().mockResolvedValue(encoded);
  const dimensions: number[][] = [];
  const bitmap = { width: 3200, height: 2400, close };
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
  vi.stubGlobal('OffscreenCanvas', class {
    constructor(width: number, height: number) { dimensions.push([width, height]); }
    getContext() { return { drawImage }; }
    convertToBlob = convertToBlob;
  });
  const file = new File(['photo'], 'photo.png', { type: 'image/png' });
  expect(await compressImage(file)).toBe(encoded);
  expect(dimensions).toEqual([[1600, 1200]]);
  expect(convertToBlob).toHaveBeenCalledWith({ type: 'image/jpeg', quality: 0.8 });
  expect(close).toHaveBeenCalledOnce();
  bitmap.width = 400; bitmap.height = 300;
  await compressImage(file);
  expect(dimensions[1]).toEqual([400, 300]);
});
it('does not insert after a failed upload and does not reveal storage error details', async () => {
  const { client, upload, insert } = mockClient();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('createImageBitmap', undefined);
  upload.mockResolvedValue({ error: { message: 'private/path/name.jpg' } });
  const result = await submitCheckIn(client, {
    today: '2026-11-03', body_weight_kg: 75, waist_cm: null, notes: '',
    photos: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })],
  });
  expect(result.error).toBeTruthy();
  expect(result.error).not.toContain('private/path');
  expect(insert).not.toHaveBeenCalled();
});
it('rejects invalid measurements and more than three photos before writing', async () => {
  const { client, insert } = mockClient();
  const input = { today: '2026-11-03', body_weight_kg: 75, waist_cm: null, notes: '', photos: [] };
  expect((await submitCheckIn(client, { ...input, body_weight_kg: 401 })).error).toBeTruthy();
  expect((await submitCheckIn(client, { ...input, waist_cm: 29 })).error).toBeTruthy();
  expect((await submitCheckIn(client, { ...input, notes: 'x'.repeat(1001) })).error).toBeTruthy();
  const photo = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
  expect((await submitCheckIn(client, { ...input, photos: [photo, photo, photo, photo] })).error).toBeTruthy();
  expect(insert).not.toHaveBeenCalled();
});
it('joins local sets to session dates and snapshot names, excluding deleted and orphan sets', async () => {
  const db = localDb();
  try {
    await db.workout_sessions.put({
      id: 'session', program_day_id: 'day', training_date: '2026-11-03',
      started_at: '2026-11-03T10:00:00Z', completed_at: null, client_updated_at: '2026-11-03T10:00:00Z',
    });
    const base = {
      session_id: 'session', program_exercise_id: 'program-exercise', exercise_id: 'bench',
      set_index: 0, weight_kg: 50, reps: 8, completed_at: '2026-11-03T10:00:00Z',
      client_updated_at: '2026-11-03T10:00:00Z', deleted_at: null,
    };
    await db.set_logs.bulkPut([
      { ...base, id: 'valid' }, { ...base, id: 'deleted', set_index: 1, deleted_at: '2026-11-03T10:00:00Z' },
      { ...base, id: 'orphan', session_id: 'missing' },
    ]);
    const result = await readStrength({
      id: 'active', player_id: 'player', program_id: 'program', title: 'برنامج', notes: null,
      settings: {}, training_days: [], days: [{ id: 'day', position: 0, title: 'يوم', exercises: [{
        id: 'program-exercise', exercise_id: 'bench', position: 0, sets: 3, reps_min: 8, reps_max: 12,
        rest_seconds: 60, superset_group: null, rpe: null, tempo: null, notes: null,
        name_ar: 'بنش', name_en: 'Bench', media_path: null,
      }] }],
    });
    expect(result.names).toEqual({ bench: 'بنش' });
    expect(result.sets).toEqual([{ exercise_id: 'bench', training_date: '2026-11-03', weight_kg: 50, reps: 8 }]);
  } finally { await db.delete(); }
});
