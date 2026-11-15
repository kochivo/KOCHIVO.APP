import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let male: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  male = await createUser(db, 'player');
  for (const [id, sex] of [[player, 'female'], [male, 'male']]) {
    await db.query(`insert into public.player_intake
      (player_id,birth_year,sex,height_cm,weight_kg,training_days,session_minutes,experience)
      values ($1,1995,$2,165,65,'{1,3,5}',45,'new')`, [id, sex]);
  }
});
afterAll(async () => { await db?.close(); });

it('keeps cycle rows private and rejects male inserts', async () => {
  await asUser(db, player, tx => tx.query(`insert into public.cycle_settings(player_id,enabled,asked_at) values ($1,true,now())`, [player]));
  await asUser(db, player, tx => tx.query(`insert into public.cycle_logs values ($1,'2026-11-03')`, [player]));
  for (const table of ['cycle_settings', 'cycle_logs', 'cycle_overrides']) {
    expect((await asUser(db, captain, tx => tx.query(`select * from public.${table}`))).rows).toEqual([]);
    const columns = table === 'cycle_settings' ? 'player_id' : table === 'cycle_logs' ? 'player_id,start_date' : 'player_id,day';
    const values = table === 'cycle_settings' ? '$1' : "$1,'2026-11-03'";
    await expect(asUser(db, male, tx => tx.query(`insert into public.${table}(${columns}) values (${values})`, [male]))).rejects.toThrow();
  }
});

it('exposes only the authorized light-day boolean, respecting boundaries and overrides', async () => {
  const read = (user: string, day: string) => asUser(db, user, tx => tx.query(`select public.player_light_day($1,$2) as light`, [player, day]));
  expect((await read(captain, '2026-11-03')).rows).toEqual([{ light: true }]);
  expect((await read(player, '2026-11-04')).rows).toEqual([{ light: true }]);
  expect((await read(player, '2026-11-05')).rows).toEqual([{ light: false }]);
  expect((await read(player, '2026-11-02')).rows).toEqual([{ light: false }]);
  await expect(read(male, '2026-11-03')).rejects.toThrow();
  await asUser(db, player, tx => tx.query(`insert into public.cycle_overrides values ($1,'2026-11-03')`, [player]));
  expect((await read(captain, '2026-11-03')).rows).toEqual([{ light: false }]);
});

it('applies photo privacy with no row, false and true without hiding owner photos', async () => {
  await db.query(`insert into storage.objects(bucket_id,name) values ('checkin-photos',$1)`, [`${player}/photo.jpg`]);
  await db.query(`insert into public.check_ins(player_id,week_start,photo_paths) values ($1,'2026-11-02',$2)`, [player, [`${player}/photo.jpg`]]);
  const photos = (user: string) => asUser(db, user, tx => tx.query(`select name from storage.objects where bucket_id='checkin-photos'`));
  await asUser(db, player, tx => tx.query(`delete from public.cycle_settings where player_id=$1`, [player]));
  expect((await photos(captain)).rows).toHaveLength(1);
  await asUser(db, player, tx => tx.query(`insert into public.cycle_settings(player_id,photos_captain) values ($1,false)`, [player]));
  expect((await photos(captain)).rows).toHaveLength(0);
  expect((await photos(player)).rows).toHaveLength(1);
  await asUser(db, player, tx => tx.query(`update public.cycle_settings set photos_captain=true where player_id=$1`, [player]));
  expect((await photos(captain)).rows).toHaveLength(1);
});

it('rejects missing-intake inserts, cross-player writes and invalid settings', async () => {
  const missing = await createUser(db, 'player');
  await expect(asUser(db, missing, tx => tx.query(`insert into public.cycle_settings(player_id) values ($1)`, [missing]))).rejects.toThrow();
  await expect(asUser(db, player, tx => tx.query(`insert into public.cycle_logs values ($1,'2026-11-10')`, [male]))).rejects.toThrow();
  for (const [field, value] of [['avg_cycle_days', 20], ['avg_period_days', 11], ['light_days', 6]]) {
    await expect(asUser(db, player, tx => tx.query(`update public.cycle_settings set ${field}=$1 where player_id=$2`, [value, player]))).rejects.toThrow();
  }
});

it('publishes only eligible coach gender through the existing anonymous page projection', async () => {
  await db.query(`update public.profiles set coach_gender='female',public_slug='women-coach' where id=$1`, [captain]);
  const read = () => db.transaction(async tx => {
    await tx.exec('set local role anon');
    return tx.query(`select coach_gender from public.coach_public_page('women-coach')`);
  });
  expect((await read()).rows).toEqual([{ coach_gender: 'female' }]);
  await db.query(`update public.profiles set suspended_at=now() where id=$1`, [captain]);
  expect((await read()).rows).toEqual([]);
});
