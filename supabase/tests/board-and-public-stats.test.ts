import fs from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

async function program(captain: string, player: string, weekly: boolean, settings = {}) {
  const row = (await db.query<{ id: string }>(`insert into programs
    (captain_id,player_id,title,status,created_at,settings)
    values($1,$2,'Plan','active','2026-09-01',$3) returning id`,
  [captain, player, JSON.stringify(settings)])).rows[0];
  if (!row) throw new Error('Missing program');
  await db.query(`insert into program_days(program_id,position,weekday,is_rest_day)
    select $1,n,case when $2 then n else null end,false from generate_series(0,6) n`, [row.id, weekly]);
  await db.query(`insert into player_intake
    (player_id,birth_year,sex,height_cm,weight_kg,training_days,session_minutes,experience)
    values($1,1990,'male',180,80,'{0,1,2,3,4,5,6}',60,'new')`, [player]);
  return row.id;
}

async function planned(captain: string) {
  return (await db.query<{ planned: number }>(
    `select planned from security_private.points_board($1,'2026-11-01')`, [captain])).rows[0]?.planned;
}

it.each([
  [false, '2026-11-01', 8],
  [false, '2026-10-28', 8],
  [false, '2026-11-27', 8],
  [true, '2026-11-01', 30],
])('E-1 bounds one-week dates and keeps the minimum (repeat=%s, start=%s)', async (repeatWeekly, weeklyStartedOn, count) => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-10-01');
  await program(captain, player, true, { repeatWeekly, weeklyStartedOn });
  expect(await planned(captain)).toBe(count);
});

it.each([{}, { repeatWeekly: false }, { repeatWeekly: false, weeklyStartedOn: '2026-11-01' }])(
  'E-1 preserves rotating schedules, including irrelevant weekly settings %j', async settings => {
    const { captain, player } = await createCaptainWithPlayer(db, '2026-11-10');
    await program(captain, player, false, settings);
    expect(await planned(captain)).toBe(21);
  },
);

it('E-1 changes adherence while retaining completion counting and crown patches', async () => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-10-01');
  await program(captain, player, true, { repeatWeekly: false, weeklyStartedOn: '2026-11-01' });
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
    select gen_random_uuid(),$1,date '2026-11-01'+n,'2026-11-01T08:00Z',now()
    from generate_series(0,3) n`, [player]);
  await db.query(`insert into points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
    select $1,$2,'workout',id::text,3,'counted',training_date from workout_sessions where player_id=$1`, [player, captain]);
  expect((await db.query(`select adherence,done,planned from security_private.points_board($1,'2026-11-01')`, [captain])).rows)
    .toEqual([{ adherence: 50, done: 4, planned: 8 }]);
  expect((await db.query<{ definition: string }>(`select pg_get_functiondef('public.team_leaderboard(date)'::regprocedure) definition`))
    .rows[0]?.definition).toContain('security_private.crown_holder');
});

it('E-2/E-3 counts current relationship history and rotating daily adherence for anonymous visitors', async () => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-10-30');
  await db.query(`update profiles set public_slug='audit-stats',show_public_stats=true where id=$1`, [captain]);
  for (let n = 0; n < 4; n++) {
    const extra = await createUser(db, 'player');
    await db.query(`insert into coach_clients(captain_id,player_id,started_on,access_until)
      values($1,$2,'2026-10-01','2026-12-31')`, [captain, extra]);
  }
  const id = await program(captain, player, false);
  await db.query(`update programs set created_at='2026-10-31' where id=$1`, [id]);
  await db.query(`update player_intake set training_days='{6,0,2}' where player_id=$1`, [player]);
  // Null day references remain countable, and multiple sessions on one date count once for adherence.
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
    select gen_random_uuid(),$1,d,'2026-10-01T08:00Z','2026-10-01T09:00Z',now()
    from unnest(array[date '2026-10-29',date '2026-10-30',date '2026-10-31',
      date '2026-10-31',date '2026-11-03']) d`, [player]);
  const stats = () => db.transaction(async tx => {
    await tx.exec('set local role anon');
    return (await tx.query<{ stats: unknown }>(`select coach_public_stats('audit-stats') stats`)).rows[0]?.stats;
  });
  expect(await stats()).toMatchObject({ players: 5, workouts_logged: 4, adherence_pct: 67 });
  await db.query('update program_days set is_rest_day=true where program_id=$1', [id]);
  expect(await stats()).toMatchObject({ adherence_pct: 0 });
  await db.query('update profiles set show_public_stats=false where id=$1', [captain]);
  expect(await stats()).toBeNull();
  await db.query('update profiles set show_public_stats=true where id=$1', [captain]);
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [player]);
  expect(await stats()).toBeNull();
});

it('fails on fragment drift instead of silently applying a partial migration', async () => {
  const migration = fs.readFileSync(new URL('../migrations/0148_board_and_public_stats.sql', import.meta.url), 'utf8');
  await expect(db.exec(migration)).rejects.toThrow(/source drift/);
  await db.exec('rollback');
});
