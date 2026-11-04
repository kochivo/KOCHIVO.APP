import { expect, it } from 'vitest';
import { scaleSeries } from './series';
import { compareWeeks, photoPose } from './gallery';
import type { GalleryWeek } from './gallery';
import { signGallery } from './data/gallery';

it('aligns missing body-fat weeks with the shared timeline and mirrors Arabic', () => {
  const points = [{ date: '2026-10-03', value: 20 }, { date: '2026-10-17', value: 18 }];
  const weeks = ['2026-10-03', '2026-10-10', '2026-10-17'];
  expect(scaleSeries(points, weeks, false).map(({ x, y }) => [x, y])).toEqual([[35, 25], [315, 115]]);
  expect(scaleSeries(points, weeks, true).map(({ x }) => x)).toEqual([315, 35]);
});
it('centres a single point and a flat line without invalid coordinates', () => {
  expect(scaleSeries([{ date: '2026-10-03', value: 75 }], ['2026-10-03'], false))
    .toEqual([{ date: '2026-10-03', value: 75, x: 175, y: 70 }]);
  expect(scaleSeries([{ date: 'a', value: 75 }, { date: 'b', value: 75 }], ['a', 'b'], false).map(({ y }) => y)).toEqual([70, 70]);
  expect(scaleSeries([], [], false)).toEqual([]);
});
const weeks: GalleryWeek[] = [
  { date: '2026-10-17', weight: 78.4, photos: [{ url: 'new', pose: 'side' }] },
  { date: '2026-10-03', weight: 80, photos: [{ url: 'old', pose: 'side' }, { url: 'legacy', pose: 'photo' }] },
];
it('compares distinct weeks chronologically for the selected pose', () => {
  const result = compareWeeks(weeks, '2026-10-17', '2026-10-03', 'side');
  expect(result?.before.photos[0]?.url).toBe('old');
  expect(result?.after.photos[0]?.url).toBe('new');
  expect(result?.delta).toBe(-1.6);
  expect(compareWeeks(weeks, '2026-10-17', '2026-10-17', 'side')).toBeNull();
  expect(compareWeeks(weeks, '2026-10-17', '2026-10-03', 'front')).toBeNull();
  expect(compareWeeks(weeks, 'missing', '2026-10-03', 'side')).toBeNull();
  expect(compareWeeks(weeks, '2026-10-17', '2026-10-03', 'photo')).toBeNull();
  expect(compareWeeks(weeks.map(week => ({ ...week, weight: null })), '2026-10-17', '2026-10-03', 'side')?.delta).toBeNull();
});
it('labels legacy photos without assuming a front pose', () => {
  expect(photoPose(undefined)).toBe('photo');
  expect(photoPose('side')).toBe('side');
  expect(photoPose('unknown')).toBe('photo');
});
it('keeps usable gallery photos and their poses when one historical file is missing', async () => {
  const result = await signGallery([{
    id: 'checkin', player_id: 'player', week_start: '2026-10-03', body_weight_kg: 80,
    waist_cm: null, notes: null, body_fat_pct: null,
    photo_paths: ['missing.jpg', 'side.jpg'], photo_poses: ['front', 'side'],
  }], async path => {
    if (path === 'missing.jpg') throw new Error('missing');
    return `signed/${path}`;
  });
  expect(result.failed).toBe(true);
  expect(result.weeks[0]?.photos).toEqual([{ url: 'signed/side.jpg', pose: 'side' }]);
});
