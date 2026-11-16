import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
const teams: { captain: string; player: string }[] = [];
beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (!file.startsWith('0052_')) return;
    await database.exec(`create schema cron;
      create table cron.jobs(name text primary key,schedule text,command text);
      create function cron.schedule(text,text,text) returns bigint language sql as $$
        insert into cron.jobs values($1,$2,$3) on conflict(name) do update
          set schedule=excluded.schedule,command=excluded.command returning 1::bigint $$;`);
  });
  for (const zone of ['Europe/London', 'Pacific/Auckland']) {
    const team = await createCaptainWithPlayer(db, '2026-10-01');
    teams.push(team);
    await db.query('update profiles set timezone=$1 where id in($2,$3)', [zone, team.captain, team.player]);
    const peer = await createUser(db, 'player');
    await db.query(`insert into coach_clients(captain_id,player_id,access_until,started_on)
      values($1,$2,'2027-01-01','2026-10-01')`, [team.captain, peer]);
    await db.query(`update coach_clients set access_until='2027-01-01' where captain_id=$1`, [team.captain]);
    await db.query(`insert into programs(captain_id,player_id,title,status) values($1,$2,'Plan','active')`,
      [team.captain, team.player]);
    await db.query(`with sessions as (
      insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
      select gen_random_uuid(),$1,d,d,now() from generate_series('2026-11-01'::date,'2026-11-04'::date,interval '1 day') d
      returning id,training_date)
      insert into points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
      select $1,$2,'workout',id::text,3,'counted',training_date from sessions`, [team.player, team.captain]);
  }
});
afterAll(async () => { await db?.close(); });

async function clock(instant: string) {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '${instant}' $$; discard plans;`);
}
async function job(name: string) {
  const result = await db.query<{ command: string }>('select command from cron.jobs where name=$1', [name]);
  const command = result.rows[0]?.command;
  if (!command) throw new Error('Missing job');
  await db.query(command);
}

it('uses each captain month-end day on daily dispatch and never repeats notices', async () => {
  await clock('2026-11-27T18:00:00Z');
  await job('crown-month-end-reminders');
  await job('crown-month-end-reminders');
  expect((await db.query(`select user_id from notifications where type='crown_defend'`)).rows)
    .toEqual([{ user_id: teams[1]?.player }]);
  await clock('2026-11-28T07:00:00Z');
  await job('crown-month-end-reminders');
  await job('crown-month-end-reminders');
  expect((await db.query(`select user_id from notifications where type='crown_defend' order by user_id`)).rows)
    .toEqual(teams.map(t => ({ user_id: t.player })).sort((a, b) => a.user_id.localeCompare(b.user_id)));
});

it('freezes only completed captain months and retries without rewriting winners', async () => {
  await clock('2026-11-30T11:10:00Z');
  await job('freeze-crown-winners');
  expect((await db.query('select captain_id from crown_winners')).rows).toEqual([]);
  await clock('2026-12-02T10:59:00Z');
  await job('freeze-crown-winners');
  expect((await db.query('select captain_id from crown_winners')).rows).toEqual([]);
  await clock('2026-12-02T11:00:00Z');
  await job('freeze-crown-winners');
  expect((await db.query('select captain_id from crown_winners')).rows).toEqual([{ captain_id: teams[1]?.captain }]);
  await job('freeze-crown-winners');
  await clock('2026-12-03T00:00:00Z');
  await job('freeze-crown-winners');
  const before = (await db.query('select * from crown_winners order by captain_id')).rows;
  expect(before).toHaveLength(2);
  await job('freeze-crown-winners');
  expect((await db.query('select * from crown_winners order by captain_id')).rows).toEqual(before);
});
