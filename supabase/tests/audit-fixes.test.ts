import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { buildMoneyOwed } from '../../src/features/billing/data/money-owed-model';
import { asUser, createCaptainWithPlayer, createTestDb, TEST_NOW } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
const id = (n: number) => `00000320-0000-7000-8000-${String(n).padStart(12, '0')}`;
async function inserted(sql: string, params: unknown[] = []) {
  const row = (await db.query<{ id: string }>(sql, params)).rows[0];
  if (!row) throw new Error('Missing fixture row');
  return row.id;
}
async function fixture(weekly = false) {
  const pair = await createCaptainWithPlayer(db, '2026-11-01');
  const program = await inserted(`insert into programs(captain_id,player_id,title,status)
    values($1,$2,'Plan','active') returning id`, [pair.captain, pair.player]);
  const day = await inserted(`insert into program_days(program_id,position,weekday)
    values($1,0,$2) returning id`, [program, weekly ? 0 : null]);
  const source = await inserted("insert into exercises(name_en,body_part) values('Source','upper legs') returning id");
  const target = await inserted("insert into exercises(name_en,body_part) values('Target','upper arms') returning id");
  await db.query(`insert into exercise_generator_tags(exercise_id,pattern,kind,equipment,stress,min_level)
    values($1,'hinge','compound','gym','{knee}','beginner'),($2,'hinge','compound','gym','{}','beginner')`, [source, target]);
  const item = await inserted(`insert into program_exercises(day_id,exercise_id,position,sets,reps_min,alternatives)
    values($1,$2,0,1,8,array[$3::uuid]) returning id`, [day, source, target]);
  return { ...pair, program, day, source, target, item };
}
async function intake(player: string, injuries: string[] = []) {
  await db.query(`insert into player_intake(player_id,birth_year,sex,height_cm,weight_kg,training_days,session_minutes,experience,injuries)
    values($1,1995,'male',175,75,'{0,3,5}',60,'under_1y',$2)`, [player, injuries]);
}
async function workout(player: string, date: string, day: string | null = null) {
  const session = await inserted(`insert into workout_sessions(id,player_id,program_day_id,training_date,started_at,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,$3,$3::date,$3::date+interval '1 hour',now()) returning id`, [player, day, date]);
  await db.query(`select security_private.award_points($1,'workout',$2,3::smallint,'counted',$3)`, [player, session, date]);
  await db.query("update points_log set status='counted' where player_id=$1 and source_key=$2 and kind='workout' and status='pending'", [player, session]);
  return session;
}

it.each(['id', 'logical'])('syncs the exercise with newer set values on %s conflicts and ignores stale values', async path => {
  const f = await fixture();
  const session = await inserted(`insert into workout_sessions(id,player_id,program_day_id,training_date,started_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,'2026-11-03',now(),now()) returning id`, [f.player, f.day]);
  const row = { id: id(path === 'id' ? 1 : 2), session_id: session, program_exercise_id: f.item,
    exercise_id: f.source, set_index: 1, weight_kg: 60, reps: 8, completed_at: TEST_NOW, client_updated_at: TEST_NOW };
  const sync = (value: typeof row) => asUser(db, f.player, tx => tx.query('select sync_set_logs($1)', [JSON.stringify([value])]));
  await sync(row);
  await sync({ ...row, id: path === 'id' ? row.id : id(3), exercise_id: f.target, weight_kg: 30, client_updated_at: '2026-11-03T11:00:00Z' });
  await sync(row);
  expect((await db.query('select exercise_id,weight_kg::int from set_logs where session_id=$1', [session])).rows)
    .toEqual([{ exercise_id: f.target, weight_kg: 30 }]);
});

it('counts 12 Saturday/Tuesday/Thursday planned days in November 2026 and awards 100% adherence', async () => {
  const f = await fixture(true);
  await db.query('insert into program_days(program_id,position,weekday) values($1,1,3),($1,2,5)', [f.program]);
  for (const date of [3,5,7,10,12,14,17,19,21,24,26,28]) await workout(f.player, `2026-11-${String(date).padStart(2, '0')}`);
  expect((await asUser(db, f.captain, tx => tx.query("select planned,done,adherence from team_leaderboard('2026-11-01')"))).rows)
    .toEqual([{ planned: 12, done: 12, adherence: 100 }]);
});

it.each([false, true])('awards perfect weeks at the scheduled target (weekly=%s), once only', async weekly => {
  const f = await fixture(weekly);
  await intake(f.player);
  if (weekly) await db.query('insert into program_days(program_id,position,weekday) values($1,1,3)', [f.program]);
  const dates = weekly ? ['2026-11-01', '2026-11-03'] : ['2026-11-01', '2026-11-02', '2026-11-03'];
  for (const date of dates.slice(0, -1)) await workout(f.player, date, f.day);
  const bonuses = () => db.query("select points from points_log where player_id=$1 and kind='perfect_week'", [f.player]);
  expect((await bonuses()).rows).toEqual([]);
  await workout(f.player, dates.at(-1) ?? '', f.day);
  await workout(f.player, '2026-11-04', f.day);
  expect((await bonuses()).rows).toEqual([{ points: 10 }]);
});

it.each([false, true])('preserves an active PT billing start on renewal (offer=%s) and charges a late offline workout once', async offer => {
  const f = await fixture();
  const pkg = await inserted(`insert into captain_packages(captain_id,name,kind,days,sessions,price_egp)
    values($1,'PT','sessions',30,10,1000) returning id`, [f.captain]);
  const sale = offer ? await inserted(`insert into captain_offers(captain_id,name,kind,value,starts_at,ends_at)
    values($1,'Discount','percent',10,now()-interval '1 day',now()+interval '1 day') returning id`, [f.captain]) : null;
  const renew = () => asUser(db, f.captain, tx => offer
    ? tx.query('select renew_player_offer($1,$2,null,null,null,$3)', [f.player, sale, pkg])
    : tx.query('select renew_player($1,null,null,null,$2)', [f.player, pkg]));
  await db.query("update coach_clients set sessions_left=2,billing_started_at='2026-11-01T07:00Z' where player_id=$1", [f.player]);
  await renew();
  expect((await db.query('select billing_started_at=$2::timestamptz preserved from coach_clients where player_id=$1',
    [f.player, '2026-11-01T07:00Z'])).rows).toEqual([{ preserved: true }]);
  const rows = [{ id: id(offer ? 11 : 10), program_day_id: f.day, training_date: '2026-11-02',
    started_at: '2026-11-02T08:00Z', completed_at: '2026-11-02T09:00Z', client_updated_at: TEST_NOW }];
  for (let retry = 0; retry < 2; retry++) await asUser(db, f.player, tx => tx.query('select sync_workout_sessions($1)', [JSON.stringify(rows)]));
  expect((await db.query('select sessions_left from coach_clients where player_id=$1', [f.player])).rows).toEqual([{ sessions_left: 11 }]);
  await db.query("update coach_clients set access_until='2026-11-01' where player_id=$1", [f.player]);
  await renew();
  expect((await db.query('select billing_started_at=now() restarted from coach_clients where player_id=$1', [f.player])).rows)
    .toEqual([{ restarted: true }]);
});

it.each(['frozen_at', 'awaiting_plans_at'])('excludes %s expiry debt but keeps unpaid installments and receipts', async column => {
  const f = await createCaptainWithPlayer(db);
  await db.query(`update coach_clients set access_until='2026-11-01',${column}=now() where player_id=$1`, [f.player]);
  const owed = () => asUser(db, f.captain, tx => tx.query('select reason,amount_egp from captain_money_owed()'));
  expect((await owed()).rows).toEqual([]);
  await db.query(`insert into player_payments(captain_id,player_id,days,period_start,period_end,price_egp,amount_egp)
    values($1,$2,30,'2026-10-03','2026-11-01',1000,400)`, [f.captain, f.player]);
  expect((await owed()).rows).toEqual([{ reason: 'partial', amount_egp: 600 }]);
  await db.query(`insert into payment_receipts(id,captain_id,player_id,amount_egp,photo_path)
    values($1,$2,$3,500,$4)`, [id(column === 'frozen_at' ? 21 : 22), f.captain, f.player, `${f.player}/${f.captain}/${id(23)}.jpg`]);
  expect((await owed()).rows).toEqual([{ reason: 'receipt_pending', amount_egp: 500 }]);
});

it('does not label frozen or waiting subscriptions as expiring soon', () => {
  const base = { fullName: 'Player', accessUntil: '2026-11-05' };
  const players = [{ ...base, playerId: 'frozen', frozenAt: TEST_NOW },
    { ...base, playerId: 'waiting', awaitingPlansAt: TEST_NOW }, { ...base, playerId: 'active' }];
  expect(buildMoneyOwed([], players, new Map(), new Date(TEST_NOW), 'Africa/Cairo').rows.map(row => row.playerId)).toEqual(['active']);
});

it.each(['injury', 'discomfort'])('rejects a %s request that loads another recorded injury', async reason => {
  const f = await fixture();
  await intake(f.player, ['shoulder']);
  await db.query("update exercise_generator_tags set stress='{shoulder}' where exercise_id=$1", [f.target]);
  await expect(asUser(db, f.player, tx => tx.query('select request_exercise_swap($1,$2,$3,$4)',
    [f.item, f.target, reason === 'injury' ? 'knee' : null, reason]))).rejects.toMatchObject({ code: '22023' });
});

it.each(['injury', 'discomfort'])('rechecks recorded injuries at %s approval', async reason => {
  const f = await fixture();
  await intake(f.player);
  const request = (await asUser(db, f.player, tx => tx.query<{ id: string }>('select request_exercise_swap($1,$2,$3,$4) id',
    [f.item, f.target, reason === 'injury' ? 'knee' : null, reason]))).rows[0]?.id;
  await db.query("update player_intake set injuries='{shoulder}' where player_id=$1", [f.player]);
  await db.query("update exercise_generator_tags set stress='{shoulder}' where exercise_id=$1", [f.target]);
  await expect(asUser(db, f.captain, tx => tx.query('select decide_exercise_swap($1,true)', [request])))
    .rejects.toMatchObject({ code: '40001' });
});

it.each([false, true])('preserves pain swap alternatives and respects later captain edits (edited=%s)', async edited => {
  const f = await fixture();
  const extra = await inserted("insert into exercises(name_en,body_part) values('Extra','upper arms') returning id");
  const third = await inserted("insert into exercises(name_en,body_part) values('Third','upper arms') returning id");
  const alternatives = [f.target, extra, third];
  await db.query('update program_exercises set alternatives=$1 where id=$2', [alternatives, f.item]);
  const report = await inserted(`insert into pain_reports(id,player_id,captain_id,program_exercise_id,area,side_view,severity,kind)
    values(gen_random_uuid(),$1,$2,$3,'knee_r','front',4,'sharp') returning id`, [f.player, f.captain, f.item]);
  await asUser(db, f.captain, tx => tx.query("select answer_pain($1,'swap_2w')", [report]));
  expect((await db.query('select swap_alternatives from pain_reports where id=$1', [report])).rows)
    .toEqual([{ swap_alternatives: alternatives }]);
  if (edited) await db.query('update program_exercises set exercise_id=$1,alternatives=array[$2::uuid] where id=$3', [extra, third, f.item]);
  await db.query("update pain_reports set swap_until='2026-11-02' where id=$1", [report]);
  await asUser(db, f.player, tx => tx.query('select expire_pain_swaps()'));
  expect((await db.query('select exercise_id,alternatives from program_exercises where id=$1', [f.item])).rows)
    .toEqual([{ exercise_id: edited ? extra : f.source, alternatives: edited ? [third] : alternatives }]);
});

it('does not accept a player-supplied pain swap snapshot', async () => {
  const f = await fixture();
  await expect(asUser(db, f.player, tx => tx.query(`insert into pain_reports
    (id,captain_id,program_exercise_id,area,side_view,severity,kind,swap_alternatives)
    values($1,$2,$3,'knee_r','front',4,'sharp',array[$4::uuid])`, [id(30), f.captain, f.item, f.target])))
    .rejects.toMatchObject({ code: '42501' });
});

it('carries the original alternatives through overlapping temporary pain swaps', async () => {
  const f = await fixture();
  const next = await inserted("insert into exercises(name_en,body_part) values('Recovery','upper arms') returning id");
  await db.query(`insert into exercise_generator_tags(exercise_id,pattern,kind,equipment,stress,min_level)
    values($1,'hinge','compound','gym','{}','beginner')`, [next]);
  await db.query('update program_exercises set alternatives=$1 where id=$2', [[f.target, next], f.item]);
  const report = (exercise: string) => inserted(`insert into pain_reports
    (id,player_id,captain_id,program_exercise_id,exercise_id,area,side_view,severity,kind)
    values(gen_random_uuid(),$1,$2,$3,$4,'knee_r','front',4,'sharp') returning id`, [f.player, f.captain, f.item, exercise]);
  const first = await report(f.source);
  await asUser(db, f.captain, tx => tx.query("select answer_pain($1,'swap_2w')", [first]));
  const second = await report(f.target);
  await asUser(db, f.captain, tx => tx.query("select answer_pain($1,'swap_2w')", [second]));
  await db.query("update pain_reports set swap_until='2026-11-02' where id=$1", [first]);
  await asUser(db, f.player, tx => tx.query('select expire_pain_swaps()'));
  expect((await db.query('select exercise_id from program_exercises where id=$1', [f.item])).rows).toEqual([{ exercise_id: next }]);
  await db.query("update pain_reports set swap_until='2026-11-02' where id=$1", [second]);
  await asUser(db, f.player, tx => tx.query('select expire_pain_swaps()'));
  expect((await db.query('select exercise_id,alternatives from program_exercises where id=$1', [f.item])).rows)
    .toEqual([{ exercise_id: f.source, alternatives: [f.target, next] }]);
});
