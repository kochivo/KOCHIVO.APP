import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';
import { notificationTypes } from '../../src/types/enums';

let db: PGlite, captain: string, player: string;
let previousNotificationTypes:string[];
const form = '00000000-0000-7000-8000-000000000171';
const question = '00000000-0000-7000-8000-000000000172';
beforeAll(async () => {
  db = await createTestDb(async (file,db) => {
    if (file !== '0093_form_schedules.sql') return;
    const result=await db.query<{definition:string}>(`select pg_get_constraintdef(oid) as definition from pg_constraint
      where conrelid='public.notifications'::regclass and conname='notifications_type_check'`);
    previousNotificationTypes=[...(result.rows[0]?.definition ?? '').matchAll(/'([^']+)'::text/g)].map(m => m[1] ?? '');
  });
  ({ captain, player } = await createCaptainWithPlayer(db));
  await asUser(db, captain, async tx => {
    await tx.query(`insert into forms(id,captain_id,title,kind,schedule,remind_after_hours)
      values ($1,$2,'Weekly','checkin','{"every":"week","weekday":2,"hour":12}',24)`, [form,captain]);
    await tx.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required)
      values ($1,$2,0,'Weight','Weight','number',true)`, [question,form]);
    await tx.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required)
      values ('00000000-0000-7000-8000-000000000176',$1,1,'Pain','Pain','yesno',true)`,[form]);
  });
});
afterAll(async () => { await db.close(); });
it('preserves every pre-0093 notification type and accepts form_requested as the only addition',async () => {
  expect(previousNotificationTypes).toHaveLength(16);
  expect(notificationTypes).toEqual([...previousNotificationTypes,'form_requested']);
  for(const type of [...previousNotificationTypes,'form_requested']) {
    const result=await db.query<{id:string}>(`insert into notifications(id,user_id,type,payload)
      values (gen_random_uuid(),$1,$2,'{}') returning id`,[player,type]);
    expect(result.rows).toHaveLength(1);
    await db.query(`delete from notifications where id=$1`,[result.rows[0]?.id]);
  }
  await expect(db.query(`insert into notifications(id,user_id,type,payload)
    values (gen_random_uuid(),$1,'unsupported','{}')`,[player])).rejects.toThrow(/notifications_type_check/);
});
it('runs only due schedules and is idempotent across repeated runs and pending periods', async () => {
  await db.query(`select public.queue_form_schedules($1)`, ['2026-11-03T09:59:00Z']);
  expect((await db.query(`select id from form_requests`)).rows).toHaveLength(0);
  for (const now of [TEST_NOW,TEST_NOW,'2026-11-10T10:00:00Z']) await db.query(`select public.queue_form_schedules($1)`, [now]);
  expect((await db.query(`select id from form_requests`)).rows).toHaveLength(1);
});
it('ignores unlinked, frozen, expired, pending and suspended players', async () => {
  await createUser(db, 'player');
  for (const state of ['frozen_at=now()', `access_until='2026-11-02'`, 'pending=true', 'archived_at=now()']) {
    const p = await createUser(db, 'player');
    await db.query(`insert into coach_clients(captain_id,player_id,access_until) values ($1,$2,'2026-12-01')`, [captain,p]);
    await db.query(`update coach_clients set ${state} where player_id=$1`, [p]);
  }
  const suspended = await createUser(db,'player');
  await db.query(`insert into coach_clients(captain_id,player_id,access_until) values ($1,$2,'2026-12-01')`,[captain,suspended]);
  await db.query(`update profiles set suspended_at=now() where id=$1`,[suspended]);
  await db.query(`select public.queue_form_schedules($1)`, [TEST_NOW]);
  expect((await db.query(`select id from form_requests`)).rows).toHaveLength(1);
});
it('keeps workers owner-only and clamps monthly dates without sending archived forms',async () => {
  await expect(asUser(db,captain,tx => tx.query(`select public.queue_form_schedules()`))).rejects.toThrow(/permission denied/);
  await expect(asUser(db,player,tx => tx.query(`select public.queue_form_reminders()`))).rejects.toThrow(/permission denied/);
  const id='00000000-0000-7000-8000-000000000175';
  await db.query(`insert into forms(id,captain_id,title,kind,schedule) values ($1,$2,'Monthly','custom','{"every":"month","day":31,"hour":12}')`,[id,captain]);
  await db.query(`select public.queue_form_schedules($1)`,['2026-11-29T10:00:00Z']);
  expect((await db.query(`select id from form_requests where form_id=$1`,[id])).rows).toHaveLength(0);
  await db.query(`select public.queue_form_schedules($1)`,['2026-11-30T10:00:00Z']);
  expect((await db.query(`select id from form_requests where form_id=$1`,[id])).rows).toHaveLength(1);
  await db.query(`update forms set archived_at=now() where id=$1`,[id]);
  await db.query(`select public.queue_form_schedules($1)`,['2026-12-31T10:00:00Z']);
  expect((await db.query(`select id from form_requests where form_id=$1`,[id])).rows).toHaveLength(1);
});
it('manual sends reuse a pending scheduled request and manual reminders skip inactive recipients',async () => {
  const existing = (await db.query<{id:string}>(`select id from form_requests where form_id=$1`,[form])).rows[0];
  if (!existing) throw new Error('Missing request');
  const result = await asUser(db,captain,tx => tx.query<{id:string}>(`select public.send_custom_form_request(
    '00000000-0000-7000-8000-000000000174',$1,$2,null) as id`,[form,player]));
  expect(result.rows[0]?.id).toBe(existing.id);
  expect((await db.query(`select id from form_requests where form_id=$1`,[form])).rows).toHaveLength(1);
  await db.query(`update coach_clients set frozen_at=now() where captain_id=$1 and player_id=$2`,[captain,player]);
  expect((await asUser(db,captain,tx => tx.query<{ok:boolean}>(`select public.remind_custom_form_request($1) as ok`,[existing.id]))).rows[0]?.ok).toBe(false);
  await db.query(`update coach_clients set frozen_at=null where captain_id=$1 and player_id=$2`,[captain,player]);
});
it('reminds once through notifications and rejects unauthorized manual reminders', async () => {
  const stranger = await createUser(db, 'captain');
  const r = (await db.query<{ id: string }>(`select id from form_requests where form_id=$1`,[form])).rows[0];
  if (!r) throw new Error('Missing scheduled request');
  await expect(asUser(db,stranger,tx => tx.query(`select public.remind_custom_form_request($1)`,[r.id]))).rejects.toThrow();
  await db.query(`select public.queue_form_reminders($1)`, ['2026-11-04T09:59:00Z']);
  expect((await db.query(`select reminded_at from form_requests where form_id=$1`,[form])).rows).toEqual([{ reminded_at: null }]);
  for (let i=0;i<2;i++) await db.query(`select public.queue_form_reminders($1)`, ['2026-11-04T10:00:00Z']);
  expect((await db.query(`select id from notifications where payload->>'request_id'=$1`,[r.id])).rows).toHaveLength(1);
  expect((await db.query(`select type,payload from notifications where payload->>'request_id'=$1`,[r.id])).rows)
    .toEqual([{type:'form_requested',payload:{name:'Weekly',request_id:r.id,form_id:form}}]);
});
it('completes send → answer → answered_at → captain review under RLS', async () => {
  const r = (await db.query<{ id: string }>(`select id from form_requests where form_id=$1`,[form])).rows[0];
  if (!r) throw new Error('Missing scheduled request');
  await asUser(db,player,tx => tx.query(`insert into form_answers(id,request_id,question_id,value)
    values ('00000000-0000-7000-8000-000000000173',$1,$2,'72'),
    ('00000000-0000-7000-8000-000000000177',$1,'00000000-0000-7000-8000-000000000176','false')`,[r.id,question]));
  expect((await asUser(db,captain,tx => tx.query(`select status from form_requests where id=$1`,[r.id]))).rows).toEqual([{status:'answered'}]);
  await asUser(db,captain,tx => tx.query(`update form_requests set reviewed_at=now(),captain_reply='Good' where id=$1`,[r.id]));
  expect((await db.query(`select status from form_requests where id=$1`,[r.id])).rows).toEqual([{status:'reviewed'}]);
  await db.query(`select public.queue_form_schedules($1)`, [TEST_NOW]);
  expect((await db.query(`select id from form_requests where form_id=$1`,[form])).rows).toHaveLength(1);
  await db.query(`select public.queue_form_schedules($1)`, ['2026-11-10T10:00:00Z']);
  expect((await db.query(`select id from form_requests where form_id=$1`,[form])).rows).toHaveLength(2);
});
it('the scheduler also reuses a request that was sent manually first',async () => {
  const manualForm='00000000-0000-7000-8000-000000000178',manualRequest='00000000-0000-7000-8000-000000000179';
  await db.query(`insert into forms(id,captain_id,title,kind,schedule) values ($1,$2,'Manual first','custom',
    '{"every":"week","weekday":2,"hour":12}')`,[manualForm,captain]);
  await asUser(db,captain,tx => tx.query(`select public.send_custom_form_request($1,$2,$3,null)`,[manualRequest,manualForm,player]));
  await db.query(`select public.queue_form_schedules($1)`,[TEST_NOW]);
  expect((await db.query(`select id from form_requests where form_id=$1`,[manualForm])).rows).toEqual([{id:manualRequest}]);
  await asUser(db,captain,tx => tx.query(`select public.remind_custom_form_request($1)`,[manualRequest]));
  expect((await db.query(`select type,payload from notifications where payload->>'request_id'=$1`,[manualRequest])).rows)
    .toEqual([{type:'form_requested',payload:{name:'Manual first',request_id:manualRequest,form_id:manualForm}}]);
});
