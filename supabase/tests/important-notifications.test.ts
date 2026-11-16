import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
type Event = { user_id: string; type: string; payload: Record<string, unknown> };
async function events(captain: string, player: string) {
  return (await db.query<Event>(`select user_id,type,payload from public.notifications
    where user_id in ($1,$2) and type in ('checkin_submitted','form_answered','swap_requested',
      'form_check_submitted','receipt_submitted','coach_replied','swap_decided') order by created_at,id`, [captain, player])).rows;
}
async function fixture() {
  const pair = await createCaptainWithPlayer(db);
  await db.query("update public.profiles set full_name=case when id=$1 then 'Coach' else 'Player' end where id in ($1,$2)", [pair.captain, pair.player]);
  const ids = (await db.query<{ id: string }>('select gen_random_uuid() id from generate_series(1,10)')).rows.map(r => r.id);
  const [checkin, video, form, request, receipt, swap, exercise, target, program, day] = ids;
  if (!checkin || !video || !form || !request || !receipt || !swap || !exercise || !target || !program || !day) throw new Error('Missing ids');
  await db.query("insert into public.exercises(id,name_en,body_part) values($1,'Squat','legs'),($2,'Lunge','legs')", [exercise, target]);
  await db.query("insert into public.programs(id,captain_id,player_id,title,status) values($1,$2,$3,'Plan','active')", [program, pair.captain, pair.player]);
  await db.query("insert into public.program_days(id,program_id,position,title) values($1,$2,0,'Day')", [day, program]);
  await db.query('insert into public.program_exercises(id,day_id,exercise_id,position,sets,reps_min) values($1,$2,$3,0,3,8)', [swap, day, exercise]);
  await db.query("insert into public.forms(id,captain_id,title,kind) values($1,$2,'Form','checkin')", [form, pair.captain]);
  await db.query('insert into public.form_requests(id,form_id,captain_id,player_id) values($1,$2,$3,$4)', [request, form, pair.captain, pair.player]);
  const sql = {
    checkin: `insert into public.check_ins(id,player_id,captain_id,week_start,notes,photo_paths)
      values('${checkin}','${pair.player}','${pair.captain}','2026-11-01','private notes','{private/photo}') on conflict do nothing`,
    video: `insert into public.form_checks(id,player_id,captain_id,exercise_id,video_path,note)
      values('${video}','${pair.player}','${pair.captain}','${exercise}','private/video','private note') on conflict do nothing`,
    swap: `insert into public.exercise_swap_requests(id,player_id,captain_id,program_exercise_id,from_exercise_id,to_exercise_id,reason)
      values('${swap}','${pair.player}','${pair.captain}','${swap}','${exercise}','${target}','discomfort') on conflict do nothing`,
    receipt: `insert into public.payment_receipts(id,player_id,captain_id,amount_egp,photo_path)
      values('${receipt}','${pair.player}','${pair.captain}',12345,'${pair.player}/${pair.captain}/${receipt}.jpg') on conflict do nothing`,
  };
  // Test-only owner writes preserve auth.uid() while exercising tables normally written by definer RPCs.
  const act = (actor: string, query: string) => db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [actor]);
    await tx.exec(query);
  });
  return { ...pair, checkin, video, form, request, receipt, swap, exercise, target, sql, act };
}

it('notifies the captain once for each real submission with only link ids and player name', async () => {
  const f = await fixture();
  for (const query of Object.values(f.sql)) { await f.act(f.player, query); await f.act(f.player, query); }
  await f.act(f.player, `update public.form_requests set answered_at=now() where id='${f.request}'`);
  await f.act(f.player, `update public.form_requests set answered_at=now(),reminded_at=now() where id='${f.request}'`);
  const rows = await events(f.captain, f.player);
  expect(rows).toHaveLength(5);
  const base = { player_id: f.player, display_name: 'Player' };
  expect(rows).toEqual(expect.arrayContaining([
    { user_id: f.captain, type: 'checkin_submitted', payload: { ...base, checkin_id: f.checkin } },
    { user_id: f.captain, type: 'form_check_submitted', payload: { ...base, form_check_id: f.video } },
    { user_id: f.captain, type: 'swap_requested', payload: { ...base, request_id: f.swap, program_exercise_id: f.swap } },
    { user_id: f.captain, type: 'receipt_submitted', payload: { ...base, receipt_id: f.receipt } },
    { user_id: f.captain, type: 'form_answered', payload: { ...base, request_id: f.request, form_id: f.form } },
  ]));
});

it.each(['checkin', 'video'] as const)('notifies once for review or a changed non-empty reply on %s', async kind => {
  const f = await fixture();
  await f.act(f.player, f.sql[kind]);
  const table = kind === 'checkin' ? 'check_ins' : 'form_checks', id = f[kind];
  const update = `update public.${table} set reviewed_at=now(),captain_reply='private reply' where id='${id}'`;
  await asUser(db, f.captain, tx => tx.exec(update));
  await asUser(db, f.captain, tx => tx.exec(update));
  await f.act(f.captain, `update public.${table} set reviewed_at=now()+interval '1 hour' where id='${id}'`);
  let rows = (await events(f.captain, f.player)).filter(r => r.type === 'coach_replied');
  expect(rows).toEqual([{ user_id: f.player, type: 'coach_replied', payload: {
    player_id: f.player, captain_name: 'Coach', kind: kind === 'checkin' ? 'checkin' : 'form_check',
    ...(kind === 'checkin' ? { checkin_id: id } : { form_check_id: id }),
  } }]);
  await f.act(f.captain, `update public.${table} set captain_reply='another private reply' where id='${id}'`);
  await f.act(f.captain, `update public.${table} set captain_reply='   ' where id='${id}'`);
  rows = (await events(f.captain, f.player)).filter(r => r.type === 'coach_replied');
  expect(rows).toHaveLength(2);
  expect(JSON.stringify(rows)).not.toContain('private');
});

it('notifies for a review without text and for a reply before review', async () => {
  const f = await fixture();
  await f.act(f.player, f.sql.checkin);
  await f.act(f.captain, `update public.check_ins set reviewed_at=now() where id='${f.checkin}'`);
  await f.act(f.player, f.sql.video);
  await f.act(f.captain, `update public.form_checks set captain_reply='reply' where id='${f.video}'`);
  expect((await events(f.captain, f.player)).filter(r => r.type === 'coach_replied')).toHaveLength(2);
});

it.each(['approved', 'declined'])('notifies the player only on a pending to %s swap transition', async status => {
  const f = await fixture();
  await f.act(f.player, f.sql.swap);
  const update = `update public.exercise_swap_requests set status='${status}',decided_at=now() where id='${f.swap}'`;
  await f.act(f.captain, update);
  await f.act(f.captain, update);
  await f.act(f.captain, `update public.exercise_swap_requests set created_at=created_at where id='${f.swap}'`);
  expect((await events(f.captain, f.player)).filter(r => r.type === 'swap_decided')).toEqual([
    { user_id: f.player, type: 'swap_decided', payload: { player_id: f.player, request_id: f.swap,
      program_exercise_id: f.swap, captain_name: 'Coach', status } },
  ]);
});

it('notifies on declined receipt resubmission, not pending revisions or unchanged updates', async () => {
  const f = await fixture();
  await f.act(f.player, f.sql.receipt);
  await f.act(f.player, `update public.payment_receipts set revision=revision+1 where id='${f.receipt}'`);
  await f.act(f.captain, `update public.payment_receipts set status='declined',decided_at=now(),decline_reason='private reason' where id='${f.receipt}'`);
  const resend = `update public.payment_receipts set status='pending',decided_at=null,decline_reason=null,revision=3 where id='${f.receipt}'`;
  await f.act(f.player, resend);
  await f.act(f.player, resend);
  const rows = await events(f.captain, f.player);
  expect(rows).toHaveLength(2);
  expect(rows.every(r => r.type === 'receipt_submitted' && r.user_id === f.captain)).toBe(true);
  expect(rows[0]?.payload).toEqual({ player_id: f.player, receipt_id: f.receipt, display_name: 'Player' });
});

it('never notifies the actor, including captain-generated pain swaps and player-side owner updates', async () => {
  const f = await fixture();
  for (const query of Object.values(f.sql)) await f.act(f.captain, query);
  await f.act(f.captain, `update public.form_requests set answered_at=now() where id='${f.request}'`);
  await f.act(f.player, `update public.check_ins set reviewed_at=now(),captain_reply='self' where id='${f.checkin}'`);
  await f.act(f.player, `update public.form_checks set reviewed_at=now() where id='${f.video}'`);
  await f.act(f.player, `update public.exercise_swap_requests set status='declined',decided_at=now() where id='${f.swap}'`);
  expect(await events(f.captain, f.player)).toEqual([]);
});

it('keeps only the existing pain answer notification when the captain generates and approves a pain swap', async () => {
  const f = await fixture();
  await db.query("update public.exercises set body_part='upper arms' where id=$1", [f.target]);
  await db.query(`insert into public.exercise_generator_tags(exercise_id,pattern,kind,equipment,stress,min_level)
    values($1,'hinge','compound','gym','{}','beginner'),($2,'hinge','compound','gym','{}','beginner')`, [f.exercise, f.target]);
  await db.query('update public.program_exercises set alternatives=array[$1::uuid] where id=$2', [f.target, f.swap]);
  const report = (await asUser(db, f.player, tx => tx.query<{ id: string }>(`insert into public.pain_reports
    (id,captain_id,program_exercise_id,exercise_id,area,side_view,severity,kind)
    values(gen_random_uuid(),$1,$2,$3,'knee_r','front',4,'sharp') returning id`, [f.captain, f.swap, f.exercise]))).rows[0];
  if (!report) throw new Error('Missing pain report');
  await asUser(db, f.captain, tx => tx.query("select public.answer_pain($1,'swap_2w')", [report.id]));
  expect((await db.query("select type from public.notifications where user_id=$1 and type in ('pain_answered','swap_decided')", [f.player])).rows)
    .toEqual([{ type: 'pain_answered' }]);
  expect((await db.query('select exercise_id from public.program_exercises where id=$1', [f.swap])).rows).toEqual([{ exercise_id: f.target }]);
  // A later player request in another transaction must still receive its decision notification.
  await db.query('delete from public.exercise_swap_requests where program_exercise_id=$1', [f.swap]);
  await f.act(f.player, f.sql.swap);
  await f.act(f.captain, `update public.exercise_swap_requests set status='declined',decided_at=now() where id='${f.swap}'`);
  expect((await events(f.captain, f.player)).map(row => row.type).sort()).toEqual(['swap_decided', 'swap_requested']);
});

it('skips suspended recipients in both directions', async () => {
  const f = await fixture();
  await db.query('update public.profiles set suspended_at=now() where id=$1', [f.captain]);
  for (const query of Object.values(f.sql)) await f.act(f.player, query);
  await f.act(f.player, `update public.form_requests set answered_at=now() where id='${f.request}'`);
  await db.query('update public.profiles set suspended_at=null where id=$1', [f.captain]);
  await db.query('update public.profiles set suspended_at=now() where id=$1', [f.player]);
  await f.act(f.captain, `update public.check_ins set reviewed_at=now() where id='${f.checkin}'`);
  await f.act(f.captain, `update public.exercise_swap_requests set status='declined',decided_at=now() where id='${f.swap}'`);
  expect(await events(f.captain, f.player)).toEqual([]);
});

it('keeps all source writes when notification insertion fails', async () => {
  const f = await fixture();
  await db.exec(`create function public.fail_important_notification() returns trigger language plpgsql as $$ begin
    if new.type in ('checkin_submitted','form_answered','swap_requested','form_check_submitted','receipt_submitted','coach_replied','swap_decided')
      then raise exception 'simulated notification failure'; end if; return new; end $$;
    create trigger fail_important_notification before insert on public.notifications for each row execute function public.fail_important_notification();`);
  try {
    for (const query of Object.values(f.sql)) await f.act(f.player, query);
    await f.act(f.player, `update public.form_requests set answered_at=now() where id='${f.request}'`);
    await f.act(f.captain, `update public.check_ins set reviewed_at=now() where id='${f.checkin}'`);
    await f.act(f.captain, `update public.exercise_swap_requests set status='declined',decided_at=now() where id='${f.swap}'`);
    expect((await db.query('select reviewed_at from public.check_ins where id=$1', [f.checkin])).rows[0]).toMatchObject({ reviewed_at: expect.any(Date) });
    expect((await db.query('select status from public.exercise_swap_requests where id=$1', [f.swap])).rows).toEqual([{ status: 'declined' }]);
    expect((await db.query('select status from public.form_requests where id=$1', [f.request])).rows).toEqual([{ status: 'answered' }]);
    expect((await db.query('select id from public.payment_receipts where id=$1', [f.receipt])).rows).toHaveLength(1);
    expect((await db.query('select id from public.form_checks where id=$1', [f.video])).rows).toHaveLength(1);
    expect(await events(f.captain, f.player)).toEqual([]);
  } finally {
    await db.exec('drop trigger fail_important_notification on public.notifications; drop function public.fail_important_notification()');
  }
});
