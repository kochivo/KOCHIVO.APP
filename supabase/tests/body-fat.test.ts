import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let player: string;
let captain: string;
let other: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ player, captain } = await createCaptainWithPlayer(db));
  ({ player: other } = await createCaptainWithPlayer(db));
});
afterAll(async () => { await db?.close(); });
it('saves body fat and poses for the owner and captain, hiding them from another player', async () => {
  await asUser(db, player, tx => tx.query(`insert into public.check_ins
    (week_start, body_fat_pct, photo_paths, photo_poses) values ('2026-10-31', 18.5, array[$1], array['side'])`, [`${player}/side.jpg`]));
  for (const user of [player, captain]) {
    const result = await asUser(db, user, tx => tx.query(`select body_fat_pct::text, photo_poses from public.check_ins`));
    expect(result.rows).toEqual([{ body_fat_pct: '18.5', photo_poses: ['side'] }]);
  }
  expect((await asUser(db, other, tx => tx.query('select body_fat_pct, photo_poses from public.check_ins'))).rows).toEqual([]);
  await expect(asUser(db, captain, tx => tx.query('update public.check_ins set body_fat_pct = 20'))).rejects.toThrow(/only review fields/);
});
it.each([
  ['2.9', "array['front']"], ['60.1', "array['front']"],
  ['20', "array['invalid']"], ['20', "array['front','side']"], ['20', 'array[null]::text[]'],
])('rejects invalid body fat %s or poses %s', async (fat, poses) => {
  await expect(asUser(db, player, tx => tx.query(`insert into public.check_ins
    (week_start, body_fat_pct, photo_paths, photo_poses) values ('2026-11-07', ${fat}, array[$1], ${poses})`, [`${player}/one.jpg`])))
    .rejects.toMatchObject({ code: '23514' });
});
it('keeps legacy photos without poses and accepts body-fat boundaries', async () => {
  for (const [week, fat] of [['2026-11-14', 3], ['2026-11-21', 60]] as const) {
    const result = await asUser(db, player, tx => tx.query(`insert into public.check_ins
      (week_start, body_fat_pct, photo_paths) values ($1, $2, array[$3]) returning photo_poses`, [week, fat, `${player}/legacy.jpg`]));
    expect(result.rows).toEqual([{ photo_poses: [] }]);
  }
});
