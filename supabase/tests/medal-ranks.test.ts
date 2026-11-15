import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';
import { notificationTypes } from '@/types/enums';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
it('maps every medal boundary while retaining legacy tiers', async () => {
  const result = await db.query<{ medal: string }>(`select security_private.medal_rank(n) medal from unnest(
    array[0,99,100,199,200,299,300,399,400,599,600,899,900]) n`);
  expect(result.rows.map(row => row.medal)).toEqual([
    'iron','iron','bronze','bronze','silver','silver','gold','gold','platinum','platinum','diamond','diamond','legend',
  ]);
});
it('notifies the active captain and player exactly once at 100 and 200', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`update public.profiles set full_name='Ali Private' where id=$1`, [player]);
  for (const key of ['a', 'b', 'b']) await db.query(`insert into public.points_log
    (player_id,captain_id,kind,source_key,points,status,earned_on)
    values($1,$2,'perfect_week',$3,100,'counted','2026-11-03') on conflict do nothing`, [player,captain,key]);
  const rows = (await db.query<{ type: string; payload: { medal: string } }>(
    `select type,payload from public.notifications where user_id in ($1,$2) and type in ('rank_up','player_rank_up') order by created_at,id`,
    [player,captain])).rows;
  expect(rows.filter(row => row.type === 'rank_up').map(row => row.payload.medal).sort()).toEqual(['bronze','silver']);
  expect(rows.filter(row => row.type === 'player_rank_up').map(row => row.payload.medal).sort()).toEqual(['bronze','silver']);
  await db.query('update public.coach_clients set archived_at=now() where player_id=$1', [player]);
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
    values($1,$2,'perfect_week','c',100,'counted','2026-11-03')`, [player,captain]);
  expect((await db.query(`select id from public.notifications where user_id=$1 and type='player_rank_up'`, [captain])).rows).toHaveLength(2);
});
it('counts lifetime frozen crown months, longest streak, and enforces captain access', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const other = await createCaptainWithPlayer(db);
  await db.query(`insert into public.crown_winners(captain_id,player_id,month,adherence,done,planned)
    select $1,$2,m::date,100,8,8 from unnest(array['2025-12-01','2026-01-01','2026-02-01','2026-04-01']) m`, [captain,player]);
  const counts = { workouts: 0, full_weeks: 0, prs: 0, crowns: 4, crown_streak: 3 };
  expect((await asUser(db,player,tx => tx.query('select * from public.my_medals()'))).rows).toEqual([counts]);
  expect((await asUser(db,captain,tx => tx.query('select * from public.player_medals($1)',[player]))).rows).toEqual([counts]);
  await expect(asUser(db,other.captain,tx => tx.query('select * from public.player_medals($1)',[player]))).rejects.toMatchObject({ code: '42501' });
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select * from public.my_medals()'); })).rejects.toMatchObject({ code: '42501' });
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select * from public.player_medals($1)', [player]); })).rejects.toMatchObject({ code: '42501' });
});
it('preserves every notification type and rejects unknown types', async () => {
  const { captain } = await createCaptainWithPlayer(db);
  for (const type of notificationTypes) await db.query('insert into public.notifications(user_id,type) values($1,$2)', [captain,type]);
  expect((await db.query('select distinct type from public.notifications where user_id=$1',[captain])).rows).toHaveLength(notificationTypes.length);
  await expect(db.query("insert into public.notifications(user_id,type) values($1,'unknown')",[captain])).rejects.toMatchObject({ code: '23514' });
});
it('counts completed sessions and only counted week/PR rows', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`insert into public.workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,'2026-10-01','2026-10-01T08:00Z','2026-10-01T08:30Z',now()),
      (gen_random_uuid(),$1,'2026-10-02','2026-10-02T08:00Z',null,now())`,[player]);
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
    values($1,$2,'perfect_week','week',10,'counted','2026-11-03'),($1,$2,'pr','pr',1,'counted','2026-11-03'),
      ($1,$2,'perfect_week','pending',10,'pending','2026-11-03'),($1,$2,'pr','rejected',1,'rejected','2026-11-03')`,[player,captain]);
  expect((await asUser(db,player,tx=>tx.query('select * from public.my_medals()'))).rows)
    .toEqual([{ workouts: 1, full_weeks: 1, prs: 1, crowns: 0, crown_streak: 0 }]);
});
