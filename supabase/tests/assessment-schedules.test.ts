import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite, captain: string, player: string, other: string;
const form = '00000000-0000-7000-8000-000000000191';
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  await db.query(`insert into forms(id,captain_id,title,kind) values ($1,$2,'Assessment','custom')`, [form,captain]);
});
afterAll(async () => { await db?.close(); });
async function schedule(p = player, kind = 'days', extra = '') {
  return (await db.query<{id:string}>(`insert into assessment_schedules(id,form_id,captain_id,player_id,kind,every_days,hour,starts_on${extra ? ',ends_on,max_times' : ''})
    values(gen_random_uuid(),$1,$2,$3,$4,case when $4='days' then 3 end,10,'2026-11-03'${extra}) returning id`, [form,captain,p,kind])).rows[0]?.id;
}
it('has kind checks and captain/player/other/anon access boundaries', async () => {
  const id = await schedule();
  expect((await asUser(db,captain,tx => tx.query(`select id from assessment_schedules`))).rows).toHaveLength(1);
  expect((await asUser(db,player,tx => tx.query(`select id from assessment_schedules`))).rows).toHaveLength(1);
  expect((await asUser(db,other,tx => tx.query(`select id from assessment_schedules`))).rows).toHaveLength(0);
  expect((await asUser(db,player,tx => tx.query(`update assessment_schedules set hour=11 returning id`))).rows).toHaveLength(0);
  await expect(asUser(db,other,tx => tx.query(`insert into assessment_schedules(id,form_id,captain_id,kind,hour,starts_on)
    values(gen_random_uuid(),$1,$2,'once',10,'2026-11-03')`,[form,captain]))).rejects.toThrow();
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select * from assessment_schedules'); })).rejects.toThrow(/permission denied/);
  for (const patch of ['every_days=1','hour=24','minute=60',"kind='week',weekday=null", "ends_on='2026-11-01'", 'max_times=0'])
    await expect(db.query(`update assessment_schedules set ${patch} where id=$1`,[id])).rejects.toThrow(/check constraint/);
  await asUser(db,captain,tx => tx.query(`update assessment_schedules set hour=10 where id=$1`,[id]));
  await asUser(db,captain,tx => tx.query(`delete from assessment_schedules where id=$1`,[id]));
});
it('queues by each player timezone, prevents duplicates even after answer, and limits sends', async () => {
  for (const [zone, before, due] of [
    ['Africa/Cairo','2026-11-03T07:59Z','2026-11-03T08:00Z'],
    ['Asia/Riyadh','2026-11-03T06:59Z','2026-11-03T07:00Z'],
    ['Europe/London','2026-11-03T09:59Z','2026-11-03T10:00Z'],
  ]) {
    const p = await createUser(db,'player');
    await db.query(`update profiles set timezone=$2 where id=$1`,[p,zone]);
    await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,'2027-12-31')`,[captain,p]);
    await schedule(p,'days',",'2026-11-09',2");
    await db.query(`select queue_assessment_schedules($1)`,[before]);
    expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(0);
    for (let i=0;i<2;i++) await db.query(`select queue_assessment_schedules($1)`,[due]);
    expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(1);
    await db.query(`update form_requests set answered_at=$2 where player_id=$1`,[p,due]);
    await db.query(`select queue_assessment_schedules($1)`,[due]);
    expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(1);
    await db.query(`select queue_assessment_schedules('2026-11-06T10:00Z')`);
    await db.query(`update form_requests set answered_at='2026-11-06T11:00Z' where player_id=$1`,[p]);
    await db.query(`select queue_assessment_schedules('2026-11-09T10:00Z')`);
    expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(2);
  }
});
it('keeps worker owner-only and legacy schedules unchanged', async () => {
  await expect(asUser(db,captain,tx => tx.query('select queue_assessment_schedules()'))).rejects.toThrow(/permission denied/);
  expect((await db.query<{schedule:unknown}>(`select schedule from forms where id=$1`,[form])).rows[0]?.schedule).toBeNull();
  expect((await db.query(`select oid from pg_proc where proname='queue_form_schedules'`)).rows).toHaveLength(1);
});
it('runs on-join once, ignores older links, and allows players to read all-player schedules only for their captain', async () => {
  await db.query(`update assessment_schedules set paused_at=now()`);
  const id = (await asUser(db,captain,tx => tx.query<{id:string}>(`insert into assessment_schedules(id,form_id,captain_id,kind,hour,starts_on)
    values(gen_random_uuid(),$1,$2,'on_join',10,'2026-11-03') returning id`,[form,captain]))).rows[0]?.id;
  const old = await createUser(db,'player'), unlinked = await createUser(db,'player');
  await db.query(`insert into coach_clients(captain_id,player_id,started_on,access_until) values($1,$2,'2026-11-01','2027-12-01')`,[captain,old]);
  expect((await asUser(db,unlinked,tx => tx.query(`select id from assessment_schedules where id=$1`,[id]))).rows).toHaveLength(0);
  expect((await asUser(db,player,tx => tx.query(`select id from assessment_schedules where id=$1`,[id]))).rows).toHaveLength(1);
  await db.query(`select queue_assessment_schedules('2026-11-03T08:00Z')`);
  await db.query(`update form_requests set answered_at='2026-11-03T09:00Z' where player_id=$1`,[player]);
  await db.query(`select queue_assessment_schedules('2026-11-04T08:00Z')`);
  expect((await db.query(`select id from form_requests where player_id=$1`,[player])).rows).toHaveLength(1);
  expect((await db.query(`select id from form_requests where player_id=$1`,[old])).rows).toHaveLength(0);
  await expect(asUser(db,captain,tx => tx.query('select * from security_private.assessment_deliveries'))).rejects.toThrow(/permission denied/);
  expect((await asUser(db,player,tx => tx.query('select * from assessment_schedule_counts()'))).rows).toHaveLength(0);
  expect((await asUser(db,captain,tx => tx.query(`select sends from assessment_schedule_counts() where schedule_id=$1 and player_id=$2`,[id,player]))).rows).toEqual([{sends:1}]);
});
it('handles London DST, monthly clamping, once catch-up and scheduled reminders', async () => {
  await db.query(`update assessment_schedules set paused_at=now()`);
  await db.query(`update coach_clients set archived_at=now()`);
  const p = await createUser(db,'player');
  await db.query(`update profiles set timezone='Europe/London' where id=$1`,[p]);
  await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,'2027-12-31')`,[captain,p]);
  const id = (await db.query<{id:string}>(`insert into assessment_schedules(id,form_id,captain_id,player_id,kind,weekday,hour,minute,starts_on,remind_after_hours)
    values(gen_random_uuid(),$1,$2,$3,'week',0,10,30,'2026-10-18',12) returning id`,[form,captain,p])).rows[0]?.id;
  for (const [before,due] of [['2026-10-18T09:29Z','2026-10-18T09:30Z'], ['2026-10-25T10:29Z','2026-10-25T10:30Z']]) {
    const prior = (await db.query(`select id from form_requests where player_id=$1`,[p])).rows.length;
    await db.query(`select queue_assessment_schedules($1)`,[before]);
    expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(prior);
    await db.query(`select queue_assessment_schedules($1)`,[due]);
    expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(prior+1);
    await db.query(`select queue_assessment_reminders($1::timestamptz+interval '12 hours')`,[due]);
    await db.query(`select queue_assessment_reminders($1::timestamptz+interval '12 hours')`,[due]);
    const notices = await db.query(`select n.id from notifications n join form_requests r on n.payload->>'request_id'=r.id::text
      where r.player_id=$1 and r.sent_at=$2`,[p,due]);
    expect(notices.rows).toHaveLength(2);
    await db.query(`update form_requests set answered_at=$2 where player_id=$1`,[p,due]);
  }
  await db.query(`update assessment_schedules set kind='month',weekday=null,day=31,minute=0 where id=$1`,[id]);
  await db.query(`select queue_assessment_schedules('2026-11-30T10:00Z')`);
  expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(3);
  await db.query(`update form_requests set answered_at='2026-11-30T11:00Z' where player_id=$1`,[p]);
  await db.query(`update assessment_schedules set kind='once',day=null,starts_on='2026-12-02',ends_on='2026-12-04' where id=$1`,[id]);
  await db.query(`select queue_assessment_schedules('2026-12-03T10:00Z')`);
  await db.query(`select queue_assessment_schedules('2026-12-04T10:00Z')`);
  expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(4);
});
it('preserves per-player no-reminder and 24h choices when the legacy form reminder is 12h', async () => {
  await db.query(`update assessment_schedules set paused_at=now()`);
  await db.query(`update coach_clients set archived_at=now()`);
  await db.query(`update forms set remind_after_hours=12 where id=$1`,[form]);
  for (const delay of [null,24]) {
    const p = await createUser(db,'player');
    await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,'2027-12-31')`,[captain,p]);
    await db.query(`insert into assessment_schedules(id,form_id,captain_id,player_id,kind,hour,starts_on,remind_after_hours)
      values(gen_random_uuid(),$1,$2,$3,'once',10,'2026-11-03',$4)`,[form,captain,p,delay]);
    await db.query(`select queue_assessment_schedules('2026-11-03T08:00Z')`);
    await db.query(`select queue_form_reminders('2026-11-03T20:00Z')`);
    expect((await db.query(`select reminded_at from form_requests where player_id=$1`,[p])).rows).toEqual([{reminded_at:null}]);
    expect((await db.query(`select id from notifications where user_id=$1`,[p])).rows).toHaveLength(1);
    await db.query(`select queue_assessment_reminders('2026-11-04T08:00Z')`);
    expect((await db.query(`select id from notifications where user_id=$1`,[p])).rows).toHaveLength(delay ? 2 : 1);
    await db.query(`delete from assessment_schedules where player_id=$1`,[p]);
    await db.query(`select queue_form_reminders('2026-11-05T08:00Z')`);
    expect((await db.query(`select id from notifications where user_id=$1`,[p])).rows).toHaveLength(delay ? 2 : 1);
  }
});
it('prevents the legacy worker from reminding a paused schedule', async () => {
  await db.query(`update assessment_schedules set paused_at=now()`);
  await db.query(`update coach_clients set archived_at=now()`);
  const p = await createUser(db,'player');
  await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,'2027-12-31')`,[captain,p]);
  const id = await schedule(p,'once');
  await db.query(`update assessment_schedules set remind_after_hours=12 where id=$1`,[id]);
  await db.query(`select queue_assessment_schedules('2026-11-03T08:00Z')`);
  await db.query(`update assessment_schedules set paused_at=now() where id=$1`,[id]);
  await db.query(`select queue_form_reminders('2026-11-04T08:00Z')`);
  expect((await db.query(`select reminded_at from form_requests where player_id=$1`,[p])).rows).toEqual([{reminded_at:null}]);
  expect((await db.query(`select id from notifications where user_id=$1`,[p])).rows).toHaveLength(1);
});
it('queues only approved captains, available forms and active unsuspended players', async () => {
  await db.query(`update assessment_schedules set paused_at=now()`);
  await db.query(`update coach_clients set archived_at=now()`);
  const p = await createUser(db,'player');
  await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,'2027-12-31')`,[captain,p]);
  await schedule(p,'once');
  for (const [blocked,restored] of [
    ['frozen_at=now()','frozen_at=null'], ['pending=true','pending=false'],
    ["access_until='2026-11-02'", "access_until='2027-12-31'"], ['archived_at=now()','archived_at=null'],
  ]) {
    await db.query(`update coach_clients set ${blocked} where player_id=$1`,[p]);
    await db.query(`select queue_assessment_schedules('2026-11-03T08:00Z')`);
    expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(0);
    await db.query(`update coach_clients set ${restored} where player_id=$1`,[p]);
  }
  for (const user of [p,captain]) {
    await db.query(`update profiles set suspended_at=now() where id=$1`,[user]);
    await db.query(`select queue_assessment_schedules('2026-11-03T08:00Z')`);
    expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(0);
    await db.query(`update profiles set suspended_at=null where id=$1`,[user]);
  }
  await db.query(`update forms set archived_at=now() where id=$1`,[form]);
  await db.query(`select queue_assessment_schedules('2026-11-03T08:00Z')`);
  expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(0);
  await db.query(`update forms set archived_at=null where id=$1`,[form]);
  await db.query(`select queue_assessment_schedules('2026-11-03T08:00Z')`);
  expect((await db.query(`select id from form_requests where player_id=$1`,[p])).rows).toHaveLength(1);
});
