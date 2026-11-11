import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import type { CheckIn } from './checkins';
import { signGallery } from './gallery';

const row: CheckIn = { id: 'checkin', player_id: 'player', week_start: '2026-10-03', body_weight_kg: 80,
  waist_cm: null, notes: null, body_fat_pct: null, captain_reply: null, reviewed_at: null,
  photo_paths: ['missing.jpg', 'side.jpg'], photo_poses: ['front', 'side'] };

function fakeClient() {
  const sign = vi.fn().mockResolvedValue({ data: [
    { path: 'back.jpg', signedUrl: 'signed/back.jpg', error: null },
    { path: 'missing.jpg', signedUrl: '', error: 'missing' },
    { path: 'side.jpg', signedUrl: 'signed/side.jpg', error: null },
  ], error: null });
  const from = vi.fn(() => ({ createSignedUrls: sign }));
  return { sign, from, client: { storage: { from } } as unknown as SupabaseClient<AppDatabase> };
}

it('signs every week in one ten-minute storage call and preserves photo/pose mapping', async () => {
  const { client, sign, from } = fakeClient();
  const result = await signGallery([row, { ...row, week_start: '2026-10-10', photo_paths: ['back.jpg'], photo_poses: ['back'] }], client);
  expect(from).toHaveBeenCalledWith('checkin-photos');
  expect(sign).toHaveBeenCalledExactlyOnceWith(['missing.jpg', 'side.jpg', 'back.jpg'], 600);
  expect(result.failed).toBe(true);
  expect(result.weeks.map(week => [week.failed, week.photos])).toEqual([
    [true, [{ url: 'signed/side.jpg', pose: 'side' }]],
    [false, [{ url: 'signed/back.jpg', pose: 'back' }]],
  ]);
});

it('does not sign an empty gallery', async () => {
  const { client, sign } = fakeClient();
  expect(await signGallery([], client)).toEqual({ weeks: [], failed: false });
  expect((await signGallery([{ ...row, photo_paths: [] }], client)).weeks[0]?.failed).toBe(false);
  expect(sign).not.toHaveBeenCalled();
});

it.each(['error', 'rejection'])('keeps the weeks retryable on a batch %s', async failure => {
  const { client, sign } = fakeClient();
  if (failure === 'error') sign.mockResolvedValue({ data: null, error: { message: 'unavailable' } });
  else sign.mockRejectedValue(new Error('offline'));
  const result = await signGallery([row], client);
  expect(result.weeks).toEqual([{ date: row.week_start, weight: 80, failed: true, photos: [] }]);
  expect(result.failed).toBe(true);
  expect(sign).toHaveBeenCalledTimes(1);
});
