import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string, player: string, other: string, otherPlayer: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: other, player: otherPlayer } = await createCaptainWithPlayer(db));
});
const save = (who = captain, owner = captain, month = '2026-11-01', prize = 'Free session') =>
  asUser(db, who, tx => tx.query(`insert into public.crown_prizes(captain_id,month,prize)
    values($1,$2,$3) on conflict(captain_id,month) do update set prize=excluded.prize returning prize`, [owner, month, prize]));
const read = (who: string) => asUser(db, who, tx => tx.query('select prize from public.crown_prizes'));

it('allows own current and next month CRUD, but no past or distant future writes', async () => {
  await save();
  await save(captain, captain, '2026-12-01');
  expect((await save(captain, captain, '2026-11-01', 'Discount')).rows).toEqual([{ prize: 'Discount' }]);
  expect((await read(captain)).rows).toHaveLength(2);
  for (const month of ['2026-10-01', '2027-01-01']) await expect(save(captain, captain, month)).rejects.toThrow();
  await db.query("insert into public.crown_prizes(captain_id,month,prize) values($1,'2026-10-01','Past prize')", [captain]);
  for (const sql of ["update public.crown_prizes set prize='Changed'", 'delete from public.crown_prizes']) {
    expect((await asUser(db, captain, tx => tx.query(`${sql} where month='2026-10-01' returning *`))).rows).toEqual([]);
  }
  expect((await read(captain)).rows).toHaveLength(2);
  expect((await asUser(db, captain, tx => tx.query('delete from public.crown_prizes where captain_id=$1 returning *', [captain]))).rows).toHaveLength(2);
});

it('isolates captains and players and prevents player writes', async () => {
  await save();
  await expect(save(other, captain)).rejects.toThrow();
  expect((await read(other)).rows).toEqual([]);
  expect((await read(player)).rows).toEqual([{ prize: 'Free session' }]);
  expect((await read(otherPlayer)).rows).toEqual([]);
  await expect(save(player, player)).rejects.toThrow();
  for (const who of [player, other]) {
    expect((await asUser(db, who, tx => tx.query("update public.crown_prizes set prize='Stolen' returning *"))).rows).toEqual([]);
    expect((await asUser(db, who, tx => tx.query('delete from public.crown_prizes returning *'))).rows).toEqual([]);
  }
  await db.query('update public.coach_clients set archived_at=now() where player_id=$1', [player]);
  expect((await read(player)).rows).toEqual([]);
});

it('denies suspended callers and anon access', async () => {
  await save();
  for (const who of [captain, player]) {
    await db.query('update public.profiles set suspended_at=now() where id=$1', [who]);
    expect((await read(who)).rows).toEqual([]);
    await expect(save(who, who, '2026-12-01')).rejects.toThrow();
  }
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon'); await tx.query('select * from public.crown_prizes');
  })).rejects.toThrow();
});

it('enforces trimmed length, first-of-month dates and the composite key', async () => {
  for (const prize of ['', ' ', ' x ', 'x'.repeat(121)]) await expect(save(captain, captain, '2026-11-01', prize)).rejects.toThrow();
  for (const prize of ['xx', 'x'.repeat(120)]) await save(captain, captain, '2026-11-01', prize);
  await expect(save(captain, captain, '2026-11-02')).rejects.toThrow();
  expect((await read(captain)).rows).toHaveLength(1);
});

it('uses Cairo month at a UTC month boundary and guards update targets', async () => {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '2026-11-30T22:30:00Z' $$`);
  try {
    await expect(save()).rejects.toThrow();
    await save(captain, captain, '2026-12-01');
    await save(captain, captain, '2027-01-01');
    for (const [column, value] of [['captain_id', other], ['month', '2026-11-01']]) {
      await expect(asUser(db, captain, tx => tx.query(`update public.crown_prizes set ${column}=$1 where month='2026-12-01'`, [value]))).rejects.toThrow();
    }
  } finally {
    await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
      as $$ select timestamptz '2026-11-03T10:00:00Z' $$`);
  }
});
