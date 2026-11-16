import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string, player: string, peer: string, other: string, otherPlayer: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  ({ captain, player } = await createCaptainWithPlayer(db, '2025-01-01'));
  peer = await createUser(db, 'player', 'Omar Private');
  ({ captain: other, player: otherPlayer } = await createCaptainWithPlayer(db));
  await db.query(`update public.profiles set full_name='Mona Private' where id=$1`, [player]);
  await db.query(`insert into public.coach_clients(captain_id,player_id,access_until,started_on)
    values($1,$2,'2026-12-31','2025-01-01')`, [captain, peer]);
});
const freeze = (month = '2026-10-01') => db.query('select security_private.freeze_crown_winners($1)', [month]);
interface Winner { month: string; player_id: string | null; display_name: string; adherence: number; done: number; planned: number }
const hall = (who: string) => asUser(db, who, tx => tx.query<Winner>(
  'select month::text,player_id,display_name,adherence,done,planned from public.crown_hall_of_fame()'));
const read = (who: string) => asUser(db, who, tx => tx.query('select month,adherence,done,planned from public.crown_winners'));
async function qualify(who: string, count = 4) {
  await db.query(`insert into public.programs(captain_id,player_id,title,status) values($1,$2,'Plan','active')`, [captain, who]);
  for (let day = 1; day <= count; day++) {
    const date = `2026-10-${String(day).padStart(2, '0')}`;
    const id = (await db.query<{ id: string }>(`insert into public.workout_sessions
      (id,player_id,training_date,started_at,client_updated_at) values(gen_random_uuid(),$1,$2,$2::date,now()) returning id`,
    [who, date])).rows[0]?.id;
    await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
      values($1,$2,'workout',$3,3,'counted',$4)`, [who, captain, id, date]);
  }
}
async function seed() {
  await db.query(`insert into public.crown_winners values($1,'2026-10-01',$2,50,4,8)`, [captain, player]);
}

it('freezes the ranked qualified holder once despite later program and score changes', async () => {
  await qualify(player); await qualify(peer, 5);
  await freeze();
  expect((await hall(captain)).rows).toMatchObject([{ player_id: peer, adherence: 63, done: 5, planned: 8 }]);
  await db.query(`update public.programs set status='archived' where player_id=$1`, [peer]);
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
    values($1,$2,'pr','late',100,'counted','2026-10-01')`, [player, captain]);
  await freeze();
  expect((await hall(captain)).rows).toMatchObject([{ player_id: peer, adherence: 63, done: 5, planned: 8 }]);
});

it('skips months without a qualified position one, including zero adherence', async () => {
  await qualify(player, 3); await freeze();
  expect((await hall(captain)).rows).toEqual([]);
  await qualify(peer, 4);
  await db.query(`update public.programs set status='archived' where captain_id=$1 and not is_template`, [captain]);
  await freeze();
  expect((await hall(captain)).rows).toEqual([]);
  await freeze('2026-09-01');
  expect((await hall(captain)).rows).toEqual([]);
});

it('limits team reads and exposes full names/ids only to the captain and own ids to players', async () => {
  await seed();
  expect((await hall(captain)).rows).toMatchObject([{ player_id: player, display_name: 'Mona Private' }]);
  expect((await hall(player)).rows).toMatchObject([{ player_id: player, display_name: 'Mona' }]);
  expect((await hall(peer)).rows).toMatchObject([{ player_id: null, display_name: 'Mona' }]);
  expect((await read(player)).rows).toHaveLength(1);
  expect((await read(captain)).rows).toHaveLength(1);
  expect((await hall(other)).rows).toEqual([]);
  expect((await read(other)).rows).toEqual([]);
  expect((await hall(otherPlayer)).rows).toEqual([]);
  expect((await read(otherPlayer)).rows).toEqual([]);
  await expect(asUser(db, peer, tx => tx.query('select player_id from public.crown_winners'))).rejects.toThrow();
  await db.query('update public.coach_clients set archived_at=now() where player_id=$1', [peer]);
  expect((await hall(peer)).rows).toEqual([]);
});

it('denies all client writes, freezer execution, anonymous and suspended access', async () => {
  await seed();
  for (const who of [captain, player, other]) {
    for (const sql of ['delete from public.crown_winners', 'update public.crown_winners set done=10',
      `insert into public.crown_winners select * from public.crown_winners`,
      `select security_private.freeze_crown_winners('2026-10-01')`]) {
      await expect(asUser(db, who, tx => tx.query(sql))).rejects.toThrow();
    }
  }
  for (const who of [captain, player]) {
    await db.query('update public.profiles set suspended_at=now() where id=$1', [who]);
    expect((await read(who)).rows).toEqual([]);
    await expect(hall(who)).rejects.toThrow();
  }
  for (const sql of ['select * from public.crown_hall_of_fame()', 'select month from public.crown_winners']) {
    await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query(sql); })).rejects.toThrow();
  }
});

it('returns the latest twelve frozen rows newest first', async () => {
  await db.query(`insert into public.crown_winners select $1,m,$2,50,4,8
    from generate_series('2025-09-01'::date,'2026-10-01'::date,interval '1 month') m`, [captain, player]);
  const rows = (await hall(player)).rows;
  expect(rows).toHaveLength(12);
  expect(rows[0]?.month).toBe('2026-10-01');
  expect(rows[11]?.month).toBe('2025-11-01');
});

it('backfills completed months and retries the settled cron command in winter and summer', async () => {
  let owner = '', winner = '';
  const migrated = await createTestDb(async (file, pending) => {
    if (!file.startsWith('0087_')) return;
    const team = await createCaptainWithPlayer(pending, '2026-01-01');
    owner = team.captain;
    winner = team.player;
    await pending.query(`insert into public.programs(captain_id,player_id,title,status) values($1,$2,'Plan','active')`,
      [owner, team.player]);
    await pending.query(`with sessions as (
      insert into public.workout_sessions(id,player_id,training_date,started_at,client_updated_at)
      select gen_random_uuid(),$1,d,d,now() from generate_series('2026-10-01'::date,'2026-10-04'::date,interval '1 day') d
      returning id,training_date)
      insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
      select $1,$2,'workout',id::text,3,'counted',training_date from sessions`, [team.player, owner]);
    await pending.exec(`create schema cron;
      create table cron.jobs(name text primary key, schedule text, command text);
      create function cron.schedule(text,text,text) returns bigint language sql as $$
        insert into cron.jobs values($1,$2,$3) on conflict(name) do update
          set schedule=excluded.schedule,command=excluded.command returning 1::bigint $$;`);
  });
  try {
    expect((await asUser(migrated, owner, tx => tx.query('select month::text from public.crown_hall_of_fame()'))).rows)
      .toEqual([{ month: '2026-10-01' }]);
    const job = (await migrated.query<{ schedule: string; command: string }>(
      "select schedule,command from cron.jobs where name='freeze-crown-winners'")).rows[0];
    if (!job) throw new Error('Cron job missing');
    expect(job.schedule).toBe('10 * * * *');
    const frozen = (await migrated.query('select * from crown_winners')).rows;
    for (const [instant, month] of [
      ['2026-11-02T22:10:00Z', '2026-10-01'],
      ['2026-06-02T21:10:00Z', '2026-05-01'],
    ] as const) {
      await migrated.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
        as $$ select timestamptz '${instant}' $$; discard plans;`);
      if (month === '2026-05-01') await migrated.query(`with sessions as (
        insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
        select gen_random_uuid(),$1,d,d,now() from generate_series('2026-05-01'::date,'2026-05-04'::date,interval '1 day') d
        returning id,training_date)
        insert into points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
        select $1,$2,'workout',id::text,3,'counted',training_date from sessions`, [winner, owner]);
      await migrated.query(job.command);
      const settled = (await migrated.query('select * from crown_winners order by month')).rows;
      expect(settled).toContainEqual(expect.objectContaining({ captain_id: owner, month: new Date(month), done: 4 }));
      await migrated.query(job.command);
      expect((await migrated.query('select * from crown_winners order by month')).rows).toEqual(settled);
      expect(settled).toEqual(expect.arrayContaining(frozen));
    }
  } finally { await migrated.close(); }
});
