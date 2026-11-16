import fs from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let oldCaptain: string;
const id = (n: number) => `00000323-0000-7000-8000-${String(n).padStart(12, '0')}`;
let photo: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain: oldCaptain, player } = await createCaptainWithPlayer(db, '2026-10-01'));
  captain = await createUser(db, 'captain');
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [player]);
  await db.query(`insert into coach_clients(captain_id,player_id,started_on,access_until)
    values($1,$2,'2026-11-01','2026-12-01')`, [captain, player]);
  await db.query(`insert into player_intake
    (player_id,birth_year,sex,height_cm,weight_kg,training_days,session_minutes,experience)
    values($1,1995,'female',165,65,'{1,3,5}',45,'new')`, [player]);
  await db.query(`insert into forms(id,captain_id,title,kind) values($1,$2,'Photos','checkin')`, [id(1), captain]);
  await db.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type)
    values($1,$2,0,'Photo','Photo','photos')`, [id(2), id(1)]);
  await db.query(`insert into form_requests(id,form_id,player_id,captain_id) values($1,$2,$3,$4)`,
    [id(3), id(1), player, captain]);
  photo = `forms/${player}/${id(3)}/photo.jpg`;
  await asUser(db, player, tx => tx.query(`insert into form_answers(id,request_id,question_id,photo_paths)
    values($1,$2,$3,$4)`, [id(4), id(3), id(2), [photo]]));
  await db.query(`insert into storage.objects(bucket_id,name) values('checkin-photos',$1)`, [photo]);
  for (const [owner, date, source] of [[oldCaptain, '2026-10-15', 'old'],
    [oldCaptain, '2026-11-02', 'other-captain'], [captain, '2026-10-31', 'before-boundary'],
    [captain, '2026-11-01', 'boundary'], [captain, '2026-11-02', 'current']]) {
    await db.query(`insert into points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
      values($1,$2,'workout',$3,3,'counted',$4)`, [player, owner, source, date]);
  }
});
afterAll(async () => { await db?.close(); });

const photos = (user: string) => asUser(db, user, tx => tx.query(
  'select name from storage.objects where name=$1', [photo]));
it.each([false, true])('honors photos_captain=%s while preserving owner access', async allowed => {
  await asUser(db, player, tx => tx.query(`insert into cycle_settings(player_id,photos_captain)
    values($1,$2) on conflict(player_id) do update set photos_captain=excluded.photos_captain`, [player, allowed]));
  expect((await photos(captain)).rows).toHaveLength(allowed ? 1 : 0);
  expect((await photos(player)).rows).toEqual([{ name: photo }]);
});
it('defaults to allowing photos and retains request, recipient and answer checks', async () => {
  await asUser(db, player, tx => tx.query('delete from cycle_settings where player_id=$1', [player]));
  expect((await photos(captain)).rows).toHaveLength(1);
  expect((await photos(oldCaptain)).rows).toEqual([]);
  await db.query(`insert into storage.objects(bucket_id,name) values
    ('checkin-photos',$1),('checkin-photos',$2),('checkin-photos',$3)`,
  [`forms/${player}/${id(3)}/unanswered.jpg`, `forms/${player}/${id(5)}/photo.jpg`, `forms/${oldCaptain}/${id(3)}/photo.jpg`]);
  expect((await asUser(db, captain, tx => tx.query('select name from storage.objects'))).rows).toEqual([{ name: photo }]);
});
it('limits the new captain to their own points at or after the coaching boundary', async () => {
  expect((await asUser(db, captain, tx => tx.query('select source_key from points_log order by source_key'))).rows)
    .toEqual([{ source_key: 'boundary' }, { source_key: 'current' }]);
  expect((await asUser(db, oldCaptain, tx => tx.query('select * from points_log'))).rows).toEqual([]);
});
it('preserves the player’s full points history', async () => {
  expect((await asUser(db, player, tx => tx.query('select * from points_log'))).rows).toHaveLength(5);
});
it('keeps leaderboard and personal points identical under the old and new policies', async () => {
  const read = async () => ({
    board: (await asUser(db, captain, tx => tx.query("select * from team_leaderboard('2026-11-01')"))).rows,
    mine: (await asUser(db, player, tx => tx.query('select my_points()'))).rows,
  });
  const current = await read();
  expect(current.board).toHaveLength(1);
  expect(current.mine).toHaveLength(1);
  const original = fs.readFileSync(new URL('../migrations/0081_points_and_ranks.sql', import.meta.url), 'utf8')
    .match(/create policy points_read on public\.points_log[\s\S]*?;/)?.[0];
  if (!original) throw new Error('Missing original points policy');
  const saved = (await db.query<{ qual: string }>(`select qual from pg_policies
    where schemaname='public' and tablename='points_log' and policyname='points_read'`)).rows[0];
  if (!saved) throw new Error('Missing current points policy');
  await db.exec('drop policy points_read on public.points_log;');
  try {
    await db.exec(original);
    expect(await read()).toEqual(current);
  } finally {
    await db.exec(`drop policy points_read on public.points_log;
      create policy points_read on public.points_log for select to authenticated using (${saved.qual});`);
  }
});
