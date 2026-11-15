import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
function rowId(rows: { id: string }[], index = 0): string {
  const row = rows[index];
  if (!row) throw new Error('Missing fixture row');
  return row.id;
}

async function report() {
  const pair = await createCaptainWithPlayer(db);
  const result = await asUser(db, pair.player, tx => tx.query<{ id: string }>(
    `insert into public.pain_reports(id,player_id,captain_id,area,side_view,severity,kind)
     values(gen_random_uuid(),$1,$2,'knee_r','front',4,'sharp') returning id`, [pair.player, pair.captain]));
  return { ...pair, id: rowId(result.rows) };
}
it('notifies only the linked captain and counts same-area reports', async () => {
  const r = await report();
  expect((await db.query("select * from public.notifications where user_id=$1 and type='player_pain'", [r.captain])).rows).toHaveLength(1);
  expect((await asUser(db, r.captain, tx => tx.query('select public.pain_repeat_count($1,$2) n', [r.player, 'knee_r']))).rows).toEqual([{ n: 1 }]);
  const other = await createCaptainWithPlayer(db);
  expect((await asUser(db, other.captain, tx => tx.query('select * from public.pain_reports'))).rows).toEqual([]);
  await expect(asUser(db,other.player,tx=>tx.query(`insert into public.pain_reports(id,player_id,captain_id,area,side_view,severity,kind)
    values(gen_random_uuid(),$1,$2,'knee_r','front',4,'sharp')`,[r.player,r.captain]))).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db,other.captain,tx=>tx.query("select public.answer_pain($1,'talk')",[r.id]))).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, r.player, tx => tx.query("select public.answer_pain($1,'talk')", [r.id]))).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, r.captain, tx => tx.query("update public.pain_reports set severity=1 where id=$1", [r.id]))).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, r.player, tx => tx.query('delete from public.pain_reports where id=$1', [r.id]))).rejects.toMatchObject({ code: '42501' });
});
it('counts only the same area within 30 days', async () => {
  const r = await report();
  await db.query(`insert into public.pain_reports(id,player_id,captain_id,area,side_view,severity,kind,created_at)
    values(gen_random_uuid(),$1,$2,'knee_r','front',2,'strain',now()-interval '10 days'),
      (gen_random_uuid(),$1,$2,'shoulder_l','front',2,'strain',now()),
      (gen_random_uuid(),$1,$2,'knee_r','front',2,'strain',now()-interval '31 days')`,[r.player,r.captain]);
  expect((await asUser(db,r.captain,tx=>tx.query('select public.pain_repeat_count($1,$2) n',[r.player,'knee_r']))).rows).toEqual([{ n: 2 }]);
});
it('answers talk once, notifies the player and rejects invalid or repeated replies', async () => {
  const r = await report();
  await expect(asUser(db, r.captain, tx => tx.query("select public.answer_pain($1,'invalid')", [r.id]))).rejects.toMatchObject({ code: '22023' });
  await asUser(db, r.captain, tx => tx.query("select public.answer_pain($1,'talk')", [r.id]));
  expect((await db.query('select status,reply from public.pain_reports where id=$1', [r.id])).rows).toEqual([{ status: 'answered', reply: 'talk' }]);
  expect((await db.query("select * from public.notifications where user_id=$1 and type='pain_answered'", [r.player])).rows).toHaveLength(1);
  await expect(asUser(db, r.captain, tx => tx.query("select public.answer_pain($1,'talk')", [r.id]))).rejects.toMatchObject({ code: '22023' });
});

async function exerciseReport() {
  const r = await report();
  const ex = (await db.query<{ id: string }>(`insert into public.exercises(name_en,body_part)
    values('Squat','upper legs'),('Curl','upper arms'),('Lunge','upper legs') returning id`)).rows;
  const [source, target, sameRegion] = ex.map(row => row.id);
  await db.query(`insert into public.exercise_generator_tags(exercise_id,pattern,kind,equipment,stress,min_level)
    values($1,'hinge','compound','gym','{knee}','beginner'),($2,'hinge','compound','gym','{}','beginner')`, [source, target]);
  const p = rowId((await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status)
    values($1,$2,'Plan','active') returning id`, [r.captain,r.player])).rows);
  const d = rowId((await db.query<{ id: string }>(`insert into public.program_days(program_id,position,title)
    values($1,0,'Day') returning id`, [p])).rows);
  const items = (await db.query<{ id: string }>(`insert into public.program_exercises(day_id,exercise_id,position,sets,reps_min,alternatives)
    values($1,$2,0,3,8,array[$3::uuid]),($1,$4,1,3,8,'{}'),($1,$3,2,3,8,'{}') returning id`, [d,source,target,sameRegion])).rows;
  await db.query('update public.pain_reports set program_exercise_id=$1 where id=$2',[rowId(items),r.id]);
  return { ...r, source,target, item: rowId(items), regionItem: rowId(items,1), unrelated: rowId(items,2) };
}
it('reduces only the reported exercise for 14 calendar days without editing shared prescriptions', async () => {
  const r = await exerciseReport();
  await asUser(db,r.captain,tx=>tx.query("select public.answer_pain($1,'reduce_20')",[r.id]));
  expect((await db.query('select program_exercise_id,factor::float,until::text from public.pain_load_hints where player_id=$1',[r.player])).rows)
    .toEqual([{ program_exercise_id: r.item, factor: 0.8, until: '2026-11-16' }]);
  expect((await db.query('select exercise_id,sets from public.program_exercises where id=$1',[r.item])).rows)
    .toEqual([{ exercise_id: r.source, sets: 3 }]);
});
it('rests every matching body region for 7 calendar days and protects hint writes', async () => {
  const r = await exerciseReport();
  await asUser(db,r.captain,tx=>tx.query("select public.answer_pain($1,'rest_week')",[r.id]));
  const hints = (await asUser(db,r.player,tx=>tx.query<{ program_exercise_id: string; factor: number; until: string }>(
    'select program_exercise_id,factor::float,until::text from public.pain_load_hints where player_id=$1',[r.player]))).rows;
  expect(hints).toHaveLength(2);
  expect(hints.map(row=>row.program_exercise_id).sort()).toEqual([r.item,r.regionItem].sort());
  expect(hints.every(row=>row.factor===0 && row.until==='2026-11-09')).toBe(true);
  await expect(asUser(db,r.player,tx=>tx.query('update public.pain_load_hints set factor=0.8'))).rejects.toMatchObject({ code: '42501' });
});
it('uses the reported exercise region for other pain without resting unrelated exercises', async () => {
  const r = await exerciseReport();
  await db.query("update public.pain_reports set area='other' where id=$1",[r.id]);
  await asUser(db,r.captain,tx=>tx.query("select public.answer_pain($1,'rest_week')",[r.id]));
  expect((await db.query<{ program_exercise_id: string }>('select program_exercise_id from public.pain_load_hints where player_id=$1',[r.player])).rows.map(row=>row.program_exercise_id).sort())
    .toEqual([r.item,r.regionItem].sort());
});
it('approves a safe swap through the existing decision path and restores it after two weeks', async () => {
  const r = await exerciseReport();
  await asUser(db,r.captain,tx=>tx.query("select public.answer_pain($1,'swap_2w')",[r.id]));
  expect((await db.query('select exercise_id from public.program_exercises where id=$1',[r.item])).rows).toEqual([{ exercise_id: r.target }]);
  expect((await db.query('select status,reason,injury from public.exercise_swap_requests where program_exercise_id=$1',[r.item])).rows)
    .toEqual([{ status: 'approved', reason: 'injury', injury: 'knee' }]);
  await db.query("update public.pain_reports set swap_until='2026-11-02' where id=$1",[r.id]);
  await asUser(db,r.player,tx=>tx.query('select public.expire_pain_swaps()'));
  expect((await db.query('select exercise_id from public.program_exercises where id=$1',[r.item])).rows).toEqual([{ exercise_id: r.source }]);
});
it('sync retries do not duplicate urgent notifications', async () => {
  const r = await report();
  const rows = [{ id:r.id,captain_id:r.captain,area:'knee_r',side_view:'front',severity:4,kind:'sharp',created_at:'2026-11-03T10:00:00Z' }];
  await asUser(db,r.player,tx=>tx.query('select public.sync_pain_reports($1)',[JSON.stringify(rows)]));
  expect((await db.query("select id from public.notifications where user_id=$1 and type='player_pain'",[r.captain])).rows).toHaveLength(1);
});
it('restores the original baseline after overlapping temporary swaps expire', async () => {
  const r = await exerciseReport();
  await asUser(db,r.captain,tx=>tx.query("select public.answer_pain($1,'swap_2w')",[r.id]));
  const next = rowId((await db.query<{ id: string }>("insert into public.exercises(name_en,body_part) values('Recovery','upper arms') returning id")).rows);
  await db.query(`insert into public.exercise_generator_tags(exercise_id,pattern,kind,equipment,stress,min_level)
    values($1,'hinge','compound','gym','{}','beginner')`,[next]);
  await db.query('update public.program_exercises set alternatives=array[$1::uuid] where id=$2',[next,r.item]);
  const second = rowId((await asUser(db,r.player,tx=>tx.query<{ id: string }>(`insert into public.pain_reports
    (id,captain_id,program_exercise_id,exercise_id,area,side_view,severity,kind)
    values(gen_random_uuid(),$1,$2,$3,'knee_r','front',4,'sharp') returning id`,[r.captain,r.item,r.target]))).rows);
  await asUser(db,r.captain,tx=>tx.query("select public.answer_pain($1,'swap_2w')",[second]));
  await db.query("update public.pain_reports set swap_until='2026-11-02' where id=$1",[r.id]);
  await asUser(db,r.player,tx=>tx.query('select public.expire_pain_swaps()'));
  expect((await db.query('select exercise_id from public.program_exercises where id=$1',[r.item])).rows).toEqual([{ exercise_id: next }]);
  await db.query("update public.pain_reports set swap_until='2026-11-02' where id=$1",[second]);
  await asUser(db,r.player,tx=>tx.query('select public.expire_pain_swaps()'));
  expect((await db.query('select exercise_id from public.program_exercises where id=$1',[r.item])).rows).toEqual([{ exercise_id: r.source }]);
});
it('does not approve a swap that loads another area reported in the same workout', async () => {
  const r = await exerciseReport();
  await asUser(db,r.captain,tx=>tx.query("select public.answer_pain($1,'swap_2w')",[r.id]));
  const leg = rowId((await db.query<{ id: string }>("insert into public.exercises(name_en,body_part) values('Leg exercise','upper legs') returning id")).rows);
  await db.query(`insert into public.exercise_generator_tags(exercise_id,pattern,kind,equipment,stress,min_level)
    values($1,'hinge','compound','gym','{}','beginner')`,[leg]);
  await db.query('update public.program_exercises set alternatives=array[$1::uuid] where id=$2',[leg,r.item]);
  const second = rowId((await asUser(db,r.player,tx=>tx.query<{ id: string }>(`insert into public.pain_reports
    (id,captain_id,program_exercise_id,exercise_id,area,side_view,severity,kind)
    values(gen_random_uuid(),$1,$2,$3,'shoulder_l','front',4,'sharp') returning id`,[r.captain,r.item,r.target]))).rows);
  await expect(asUser(db,r.captain,tx=>tx.query("select public.answer_pain($1,'swap_2w')",[second]))).rejects.toMatchObject({ code: '22023' });
});
