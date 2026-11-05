import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let otherCaptain: string;
let player: string;

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  otherCaptain = await createUser(db, 'captain', 'B');
});

afterAll(async () => { await db.close(); });

const upload = (name: string) => asUser(db, player, (tx) => tx.query(
  `insert into storage.objects (bucket_id, name) values ('checkin-photos', $1) returning name`, [name],
));

describe('private photo isolation', () => {
  it('A player can upload check-in photos only inside their own folder.', async () => {
    const name = `${player}/own.jpg`;
    expect((await upload(name)).rows).toEqual([{ name }]);
    await expect(upload(`${otherCaptain}/foreign.jpg`)).rejects.toThrow(/row-level security/);
  });

  it('A player’s captain can read their photo while another captain cannot.', async () => {
    const name = `${player}/read.jpg`;
    await upload(name);
    await db.query(`insert into check_ins(player_id,week_start,photo_paths)
      values ($1,'2026-11-03',$2)`, [player, [name]]);
    const read = (user: string) => asUser(db, user, (tx) => tx.query(
      `select name from storage.objects where bucket_id = 'checkin-photos' and name = $1`, [name],
    ));
    expect((await read(captain)).rows).toEqual([{ name }]);
    expect((await read(otherCaptain)).rows).toHaveLength(0);
  });

  it('A player with expired access cannot upload a new check-in photo.', async () => {
    const name = `${player}/expired.jpg`;
    await upload(`${player}/active.jpg`);
    await db.query(`update public.coach_clients set access_until = test_clock.today() - 1 where player_id = $1`, [player]);
    await expect(upload(name)).rejects.toThrow(/row-level security/);
    expect((await db.query(`select name from storage.objects where name = $1`, [name])).rows).toHaveLength(0);
  });
});
