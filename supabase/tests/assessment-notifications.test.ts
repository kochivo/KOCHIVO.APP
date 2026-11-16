import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
async function fixture() {
  const pair = await createCaptainWithPlayer(db);
  const form = (await db.query<{ id: string }>(`insert into public.forms(id,captain_id,title,kind)
    values(gen_random_uuid(),$1,'Monthly','checkin') returning id`, [pair.captain])).rows[0]?.id;
  if (!form) throw new Error('Missing form');
  const insert = async (actor = pair.captain) => (await asUser(db, actor, tx => tx.query<{ id: string }>(
    `insert into public.form_requests(id,form_id,captain_id,player_id)
      values(gen_random_uuid(),$1,$2,$3) returning id`, [form, pair.captain, pair.player]))).rows[0]?.id;
  const notices = async () => (await db.query<{ type: string; payload: Record<string, unknown> }>(
    'select type,payload from public.notifications where user_id=$1', [pair.player])).rows;
  return { ...pair, form, insert, notices };
}

it('notifies exactly once on insert, preserving the reminder payload', async () => {
  const f = await fixture();
  const request = await f.insert();
  expect(await f.notices()).toEqual([{ type: 'form_requested', payload: { name: 'Monthly', request_id: request, form_id: f.form } }]);
});

it('reviews once, ignores identical and unrelated updates, and preserves the answered trigger', async () => {
  const f = await fixture(), request = await f.insert();
  await db.query('update public.form_requests set answered_at=now() where id=$1', [request]);
  const review = () => asUser(db, f.captain, tx => tx.query(
    "update public.form_requests set reviewed_at=now(),captain_reply='Keep going' where id=$1", [request]));
  await review(); await review();
  await asUser(db, f.captain, tx => tx.query('update public.form_requests set due_at=now() where id=$1', [request]));
  expect((await f.notices()).filter(row => row.type === 'coach_replied')).toEqual([{ type: 'coach_replied', payload: {
    kind: 'assessment', request_id: request, form_id: f.form, player_id: f.player, captain_name: 'captain',
  } }]);
  expect((await db.query("select id from public.notifications where user_id=$1 and type='form_answered'", [f.captain])).rows).toHaveLength(1);
});

it('allows only the owning player to read reply columns', async () => {
  const f = await fixture(), request = await f.insert();
  await asUser(db, f.captain, tx => tx.query("update public.form_requests set reviewed_at=now(),captain_reply='Reply' where id=$1", [request]));
  const read = (actor: string) => asUser(db, actor, tx => tx.query('select reviewed_at,captain_reply from public.form_requests where id=$1', [request]));
  expect((await read(f.player)).rows).toEqual([{ reviewed_at: expect.any(Date), captain_reply: 'Reply' }]);
  expect((await read(await createUser(db, 'player'))).rows).toEqual([]);
});

it('notifies on a review without text and on changed non-empty replies only', async () => {
  const f = await fixture(), request = await f.insert();
  const update = (sql: string) => asUser(db, f.captain, tx => tx.query(
    `update public.form_requests set ${sql} where id=$1`, [request]));
  await update('reviewed_at=now()');
  await update("captain_reply='First reply'");
  await update("captain_reply='First reply'");
  await update("captain_reply='Changed reply'");
  await update("captain_reply='   '");
  await update('captain_reply=null');
  expect((await f.notices()).filter(row => row.type === 'coach_replied')).toHaveLength(3);
});

it('keeps exactly the scheduled initial notice and allows the later reminder', async () => {
  const f = await fixture();
  await db.query(`insert into public.assessment_schedules(id,form_id,captain_id,player_id,kind,hour,starts_on,remind_after_hours)
    values(gen_random_uuid(),$1,$2,$3,'once',10,'2026-11-03',12)`, [f.form, f.captain, f.player]);
  await db.exec("select public.queue_assessment_schedules('2026-11-03T10:00:00Z'); select public.queue_assessment_schedules('2026-11-03T10:00:00Z')");
  expect(await f.notices()).toEqual([{ type: 'form_requested', payload: {
    name: 'Monthly', form_id: f.form, request_id: expect.any(String), assessment_initial: true,
  } }]);
  await db.exec("select public.queue_assessment_reminders('2026-11-03T22:00:00Z')");
  expect(await f.notices()).toHaveLength(2);
});

it('never notifies the actor or a suspended player', async () => {
  const f = await fixture();
  // Owner writes model invite redemption and defensive player-side review transitions.
  await db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [f.player]);
    await tx.query(`insert into public.form_requests(id,form_id,captain_id,player_id,reviewed_at)
      values(gen_random_uuid(),$1,$2,$3,null)`, [f.form, f.captain, f.player]);
    await tx.query("update public.form_requests set reviewed_at=now(),captain_reply='Self' where form_id=$1", [f.form]);
  });
  await db.query('update public.profiles set suspended_at=now() where id=$1', [f.player]);
  await db.query('delete from public.form_requests where form_id=$1', [f.form]);
  const request = await f.insert();
  await db.query("update public.form_requests set reviewed_at=now(),captain_reply='Reply' where id=$1", [request]);
  expect(await f.notices()).toEqual([]);
});

it('keeps the review and request when notification delivery fails', async () => {
  const f = await fixture();
  await db.exec(`create function public.fail_assessment_notice() returns trigger language plpgsql as $$
    begin raise exception 'delivery failed'; end $$;
    create trigger fail_assessment_notice before insert on public.notifications
      for each row execute function public.fail_assessment_notice();`);
  try {
    const request = await f.insert();
    await asUser(db, f.captain, tx => tx.query("update public.form_requests set reviewed_at=now(),captain_reply='Saved' where id=$1", [request]));
    expect((await db.query('select captain_reply from public.form_requests where id=$1', [request])).rows).toEqual([{ captain_reply: 'Saved' }]);
  } finally {
    await db.exec('drop trigger fail_assessment_notice on public.notifications; drop function public.fail_assessment_notice()');
  }
});
