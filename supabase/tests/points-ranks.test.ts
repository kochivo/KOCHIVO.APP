import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';
import type { KoActor } from '@/features/ko-account/data/account';
import { postKoAccountChat } from '@/features/ko-account/data/route';
vi.mock('server-only', () => ({}));
const chat = vi.hoisted(() => ({ actor: null as KoActor | null, pilots: new Set<string>() }));
vi.mock('@/features/ko-account/data/account', async original => ({
  ...await original<typeof import('@/features/ko-account/data/account')>(), getKoActor: async () => chat.actor,
}));
vi.mock('@/features/ko-account/data/intents', () => ({ planIntent: async () => [{ kind: 'meal_photo', args: { foods: ['Rice'] } }] }));
vi.mock('@/features/ko-entry/server', () => ({ koAccountConfig: () => ({
  origin: new URL('https://kochivo.test'), secret: 'points-test-secret-12345678901234567890', key: 'test', pilots: chat.pilots,
}) }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); chat.pilots.clear(); });
let db: Awaited<ReturnType<typeof createTestDb>>, captain: string, player: string, peer: string, outsider: string, day: string, exercise: string;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  vi.stubEnv('KO_MEAL_RECEIPT_SECRET', 'meal-receipt-test-secret');
  await db.query(`insert into security_private.app_secrets(name,value) values ('meal_receipt','meal-receipt-test-secret') on conflict (name) do update set value=excluded.value`);
  ({ captain, player } = await createCaptainWithPlayer(db));
  peer = await createUser(db, 'player', 'Omar Private'); outsider = (await createCaptainWithPlayer(db)).captain;
  await db.query(`update public.profiles set full_name='Ali Private' where id=$1`, [player]);
  await db.query(`insert into public.coach_clients(captain_id,player_id,access_until) values ($1,$2,'2026-12-01')`, [captain, peer]);
  const p = await db.query<{ id: string }>(`insert into public.programs(captain_id,player_id,title,status) values ($1,$2,'Plan','active') returning id`, [captain, player]);
  day = (await db.query<{ id: string }>(`insert into public.program_days(program_id,position,title,weekday)
    values ($1,0,'Day',1) returning id`, [p.rows[0]?.id])).rows[0]?.id ?? '';
  exercise = (await db.query<{ id: string }>(`insert into public.exercises(name_en,body_part) values ('Lift','legs') returning id`)).rows[0]?.id ?? '';
  await db.query(`insert into public.program_exercises(day_id,exercise_id,position,sets,reps_min,rest_seconds) values ($1,$2,0,10,8,300)`, [day, exercise]);
});
async function session(minutes = 60, sets = 6, planned: string | null = day, date = '2026-11-03', finish = true) {
  const id = (await db.query<{ id: string }>(`insert into public.workout_sessions
    (id,player_id,program_day_id,training_date,started_at,client_updated_at)
    values (gen_random_uuid(),$1,$2,$3,$3::date+time '08:00',now()) returning id`,
  [player, planned, date])).rows[0]?.id ?? '';
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    select gen_random_uuid(),$1,$2,$3,i,50,8,$4::date+time '08:05',now() from generate_series(0,$5::int-1) i`,
  [id, player, exercise, date, sets]);
  if (finish) await db.query(`update public.workout_sessions set completed_at=started_at+make_interval(mins=>$2) where id=$1`, [id, minutes]); return id;
}
const logs = () => db.query<{ id: string; kind: string; status: string; points: number }>('select id,kind,status,points from public.points_log where player_id=$1 order by kind', [player]);
async function mealAward() {
  const { rows } = await db.query<{ receipt: string }>(`select
    encode(extensions.hmac($1 || ':2026-11-03','meal-receipt-test-secret','sha256'),'hex') as receipt`, [player]);
  return asUser(db, player, tx => tx.query("select public.award_meal_check('2026-11-03',$1)", [rows[0]?.receipt]));
}
const board = (caller = captain, month = '2026-11-01') => asUser(db, caller,
  tx => tx.query<{ player_id: string | null; display_name: string; monthly: number; is_crown: boolean; position: number }>(
    'select * from public.team_leaderboard($1)', [month]));
async function award(who: string, points: number, key: string, at = '2026-11-03T10:00:00Z', earned = '2026-11-03') {
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on,created_at)
    values ($1,$2,'perfect_week',$3,$4,'counted',$5,$6)`, [who, captain, key, points, earned, at]);
}
async function lateSets(id: string, start = 0) {
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    select gen_random_uuid(),$1,$2,$3,i,60,8,'2026-11-03T08:05Z',now() from generate_series($4::int,9) i`, [id, player, exercise, start]);
}
it('awards a valid workout and perfect week once across resync and repeated completion', async () => {
  const id = await session();
  expect((await logs()).rows).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'workout', points: 3, status: 'counted' }),
    expect.objectContaining({ kind: 'perfect_week', points: 10 }),
  ]));
  await db.query('update public.workout_sessions set completed_at=null where id=$1', [id]);
  await db.query('update public.workout_sessions set completed_at=started_at+interval \'1 hour\' where id=$1', [id]);
  await session();
  expect((await logs()).rows.filter(r => r.kind === 'perfect_week')).toHaveLength(1);
  expect((await logs()).rows.filter(r => r.kind === 'workout')).toHaveLength(2);
});
it.each([[19, 6], [25, 6], [60, 5]])('does not count suspicious workouts (%i minutes, %i sets)', async (minutes, sets) => {
  await session(minutes, sets);
  expect((await logs()).rows.find(r => r.kind === 'workout')?.status).toBe('pending');
});
it('uses only the twenty minute floor for unplanned sessions', async () => {
  await session(20, 0, null);
  expect((await logs()).rows).toContainEqual(expect.objectContaining({ kind: 'workout', status: 'counted' }));
});
it('excludes pending/rejected workouts and awards the week once when late sets clear the final day', async () => {
  await db.query(`insert into public.program_days(program_id,position,weekday)
    select program_id,1,2 from public.program_days where id=$1`, [day]);
  const sessions = [];
  for (const date of ['2026-11-01', '2026-11-02', '2026-11-03']) sessions.push(await session(60, 0, day, date));
  expect((await logs()).rows.filter(r => r.kind === 'perfect_week')).toHaveLength(0);
  await lateSets(sessions[0] ?? '');
  // A historical rejection remains excluded after the manual RPC is removed.
  await db.query(`update public.points_log set status='rejected',reviewed_at=now() where source_key=$1`, [sessions[1]]);
  expect((await logs()).rows.filter(r => r.kind === 'perfect_week')).toHaveLength(0);
  await lateSets(sessions[2] ?? ''); await session(60, 6, day, '2026-11-04');
  expect((await logs()).rows.filter(r => r.kind === 'perfect_week')).toEqual([expect.objectContaining({ points: 10, status: 'counted' })]);
});
it('counts two workouts on one date as one day and rechecks the week after late sets', async () => {
  await db.query(`insert into public.program_days(program_id,position,weekday)
    select program_id,1,2 from public.program_days where id=$1`, [day]);
  await session(); await session(); expect((await logs()).rows.filter(r => r.kind === 'perfect_week')).toHaveLength(0);
  const id = await session(60, 0, day, '2026-11-04');
  expect((await logs()).rows.filter(r => r.kind === 'perfect_week')).toHaveLength(0);
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,reps,completed_at,client_updated_at)
    select gen_random_uuid(),$1,$2,$3,i,8,now(),now() from generate_series(0,5) i`, [id, player, exercise]);
  expect((await logs()).rows.filter(r => r.kind === 'perfect_week')).toHaveLength(1);
});
it('rechecks completed sessions when offline sets arrive after the session sync', async () => {
  await session(60, 6, day, '2026-11-01');
  const id = await session(60, 0);
  expect((await logs()).rows.filter(r => r.status === 'pending')).toHaveLength(1);
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    select gen_random_uuid(),$1,$2,$3,i,60,8,'2026-11-03T08:05Z',now() from generate_series(0,5) i`, [id, player, exercise]);
  expect((await logs()).rows.filter(r => r.status === 'pending')).toHaveLength(0);
  expect((await logs()).rows.filter(r => r.kind === 'pr')).toEqual([
    expect.objectContaining({ points: 1, status: 'counted' }),
  ]);
});
it('caps PRs at three and counts them with their workout after late sets', async () => {
  await session();
  expect((await logs()).rows.filter(r => r.kind === 'pr')).toHaveLength(0);
  const ids = (await db.query<{ id: string }>(`insert into public.exercises(name_en,body_part)
    select 'PR '||i,'legs' from generate_series(1,4) i returning id`)).rows.map(r => r.id);
  const earlier = await session(60, 0, null, '2026-11-01');
  const later = await session(60, 0, day, '2026-11-03', false);
  for (const [index, id] of ids.entries()) {
    await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
      values (gen_random_uuid(),$1,$3,$4,$5,50,10,'2026-11-01T08:05Z',now()),
      (gen_random_uuid(),$2,$3,$4,$5,60,10,'2026-11-03T08:05Z',now())`, [earlier, later, player, id, index]);
  }
  await db.query('update public.workout_sessions set completed_at=started_at+interval \'1 hour\' where id=$1', [later]);
  expect((await logs()).rows.filter(r => r.kind === 'pr')).toHaveLength(3);
  expect((await logs()).rows.filter(r => r.kind === 'pr').every(r => r.status === 'pending')).toBe(true);
  await lateSets(later, 4);
  expect((await logs()).rows.filter(r => r.kind === 'pr').every(r => r.status === 'counted')).toBe(true);
  await db.query('update public.workout_sessions set completed_at=null where id=$1', [later]);
  await db.query('update public.workout_sessions set completed_at=started_at+interval \'1 hour\' where id=$1', [later]);
  expect((await logs()).rows.filter(r => r.kind === 'pr')).toHaveLength(3);
});
it('does not backfill pre-launch sessions when their sets change', async () => {
  await db.exec('alter table public.workout_sessions disable trigger points_workout');
  const id = await session(60, 0);
  await db.exec('alter table public.workout_sessions enable trigger points_workout');
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,$3,0,60,10,now(),now())`, [id, player, exercise]);
  expect((await logs()).rows).toHaveLength(0);
});
it('keeps rejection final when late sets would otherwise pass the checks', async () => {
  const id = await session(60, 0), point = (await logs()).rows.find(r => r.kind === 'workout')?.id ?? '';
  await db.query(`update public.points_log set status='rejected',reviewed_at=now() where id=$1`, [point]);
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    select gen_random_uuid(),$1,$2,$3,i,60,8,'2026-11-03T08:05Z',now() from generate_series(0,5) i`, [id, player, exercise]);
  expect((await logs()).rows.find(r => r.id === point)?.status).toBe('rejected');
});
it('clears a pending PR only when late sets clear its workout', async () => {
  await session(60, 6, day, '2026-11-01');
  const id = await session(60, 0);
  await db.query(`insert into public.set_logs(id,session_id,player_id,exercise_id,set_index,weight_kg,reps,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,$2,$3,0,60,10,'2026-11-03T08:05Z',now())`, [id, player, exercise]);
  expect((await logs()).rows.filter(r => r.kind === 'pr')).toEqual([expect.objectContaining({ status: 'pending' })]);
  await lateSets(id, 1);
  expect((await logs()).rows.some(r => r.status === 'pending')).toBe(false);
});
it('ignores backdated InBody scans and awards only the current Cairo month once', async () => {
  await db.query(`insert into public.body_scans(id,player_id,scan_date,weight_kg) values(gen_random_uuid(),$1,'2026-10-01',80)`, [player]);
  expect((await logs()).rows).toHaveLength(0);
  await db.query(`insert into public.body_scans(id,player_id,scan_date,weight_kg)
    values (gen_random_uuid(),$1,'2026-11-01',80),(gen_random_uuid(),$1,'2026-11-02',80)`, [player]);
  expect((await logs()).rows).toEqual([expect.objectContaining({ kind: 'inbody', points: 5 })]);
});
it('awards a signed meal receipt once per Cairo day', async () => {
  for (let i = 0; i < 2; i++) await mealAward();
  expect((await logs()).rows.filter(r => r.kind === 'meal_check')).toHaveLength(1);
});
it.each(['returned', 'thrown', 'success', 'missing'])('preserves a successful meal reply with award outcome %s', async mode => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse(TEST_NOW));
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  if (mode === 'missing') vi.stubEnv('KO_MEAL_RECEIPT_SECRET', '');
  if (mode === 'returned' || mode === 'thrown') await db.query('update public.profiles set suspended_at=now() where id=$1', [player]);
  const rpc = async (name: string, args: { p_day: string; p_receipt: string }) => {
    if (name === 'ko_rate_take') return { data: true, error: null };
    try {
      await asUser(db, player, tx => tx.query('select public.award_meal_check($1::date,$2)', [args.p_day, args.p_receipt]));
      return { error: null };
    } catch (error) { if (mode === 'thrown') throw error; return { error }; }
  };
  const query = { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null, error: null }) };
  chat.actor = { id: player, role: 'player', db: { rpc, from: () => query } } as unknown as KoActor;
  chat.pilots.add(player);
  const form = new FormData(); form.set('locale', 'en'); form.set('photo', new File(['photo'], 'meal.jpg', { type: 'image/jpeg' }));
  const request = new Request('https://kochivo.test/api/ko', { method: 'POST', body: form,
    headers: { origin: 'https://kochivo.test', host: 'kochivo.test', 'content-length': '1000' } });
  const response = await postKoAccountChat(request);
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ kind: 'message', text: expect.stringContaining('Rice') });
  expect((await logs()).rows).toHaveLength(mode === 'success' ? 1 : 0);
  if (mode === 'success') expect(warn).not.toHaveBeenCalled();
  else expect(warn).toHaveBeenCalledExactlyOnceWith(mode === 'missing'
    ? 'Meal points skipped: KO_MEAL_RECEIPT_SECRET is missing' : 'Meal points award failed');
});
it('breaks equal crown scores by raw points then earliest award and resets by month', async () => {
  await award(player, 20, 'first', '2026-11-01T09:00Z');
  await award(peer, 20, 'second', '2026-11-01T10:00Z');
  const rows = (await board()).rows;
  expect(rows.map(r => [r.player_id, r.monthly, r.is_crown])).toEqual([[player, 0, false], [peer, 0, false]]);
  expect((await board(captain, '2026-12-01')).rows.every(r => r.monthly === 0 && !r.is_crown)).toBe(true);
  const privateRows = (await board(player)).rows;
  expect(privateRows.map(r => [r.player_id, r.display_name])).toEqual([[player, 'Ali'], [null, 'Omar']]);
  expect((await board(outsider)).rows.some(r => r.player_id === player)).toBe(false);
});
it('notifies both holders on a crown swap and notifies lifetime tier crossings', async () => {
  await award(player, 19, 'nineteen'); expect((await board()).rows.some(r => r.is_crown)).toBe(false);
  await award(player, 1, 'twenty');
  for (const date of ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']) await session(60, 6, day, date);
  await db.query(`insert into public.programs(captain_id,player_id,title,status) values($1,$2,'Peer plan','active')`, [captain, peer]);
  await db.query(`insert into public.program_days(program_id,position,weekday) select id,0,1 from public.programs where player_id=$1`, [peer]);
  await db.query(`insert into public.workout_sessions(id,player_id,training_date,started_at,client_updated_at)
    select gen_random_uuid(),$1,'2026-11-01'::date+i,now(),now() from generate_series(0,4) i`, [peer]);
  await db.query(`insert into public.points_log(player_id,captain_id,kind,source_key,points,status,earned_on)
    select $1,$2,'workout',id::text,3,'counted','2026-11-03' from public.workout_sessions where player_id=$1`, [peer, captain]);
  await award(peer, 21, 'swap');
  await award(peer, 79, 'rank');
  expect((await db.query('select user_id,type from public.notifications where user_id in ($1,$2) and type in (\'crown_taken\',\'crown_lost\',\'rank_up\')', [player, peer])).rows)
    .toEqual(expect.arrayContaining([{ user_id: player, type: 'crown_taken' }, { user_id: player, type: 'crown_lost' },
      { user_id: peer, type: 'crown_taken' }, { user_id: peer, type: 'rank_up' }]));
  const mine = await asUser(db, player, tx => tx.query<{ result: { lifetime: number; crown_gap: number; logs: unknown[] } }>('select public.my_points() as result'));
  expect(mine.rows[0]?.result).toMatchObject({ lifetime: 42, crown_gap: 14 });
  expect((await asUser(db, peer, tx => tx.query<{ result: { crown_gap: number } }>('select public.my_points() as result'))).rows[0]?.result.crown_gap).toBe(0);
});
it('returns only the last ten own logs and retains lifetime across team changes', async () => {
  for (let i = 0; i < 12; i++) await award(player, 1, `history-${i}`, `2026-11-03T10:${String(i).padStart(2, '0')}:00Z`);
  const mine = (await asUser(db, player, tx => tx.query<{ result: { logs: { source_key: string }[] } }>('select public.my_points() as result'))).rows[0]?.result;
  expect(mine?.logs.map(r => r.source_key)).toEqual(Array.from({ length: 10 }, (_, i) => `history-${11 - i}`));
  await db.query('update public.coach_clients set archived_at=now() where player_id=$1', [player]);
  await db.query(`insert into public.coach_clients(captain_id,player_id,access_until) values($1,$2,'2026-12-01')`, [outsider, player]);
  expect((await board(outsider)).rows.find(r => r.player_id === player)).toMatchObject({ lifetime: 12, monthly: 0 });
  await mealAward();
  expect((await board(outsider)).rows.find(r => r.player_id === player)).toMatchObject({ lifetime: 13, monthly: 0 });
});
it('blocks direct writes, anonymous RPCs and suspended callers, while allowing owner/captain reads', async () => {
  await award(player, 20, 'read');
  for (const table of ['points_log', 'player_points']) {
    expect((await asUser(db, player, tx => tx.query(`select * from public.${table} where player_id=$1`, [player]))).rows).toHaveLength(1);
    expect((await asUser(db, captain, tx => tx.query(`select * from public.${table} where player_id=$1`, [player]))).rows).toHaveLength(1);
    expect((await asUser(db, outsider, tx => tx.query(`select * from public.${table} where player_id=$1`, [player]))).rows).toHaveLength(0);
    for (const sql of [`delete from public.${table}`, `update public.${table} set player_id=$1`, `insert into public.${table}(player_id) values ($1)`])
      await expect(asUser(db, player, tx => tx.query(sql, sql.includes('$1') ? [player] : []))).rejects.toThrow();
  }
  await expect(db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select public.my_points()'); })).rejects.toThrow();
  await db.query('update public.profiles set suspended_at=now() where id=$1', [player]);
  for (const table of ['points_log', 'player_points'])
    expect((await asUser(db, player, tx => tx.query(`select * from public.${table}`))).rows).toEqual([]);
  await expect(board(player)).rejects.toThrow();
  await expect(mealAward()).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, player, tx => tx.query('select public.my_points()'))).rejects.toThrow();
  await db.query('update public.profiles set suspended_at=now() where id=$1', [captain]);
  await expect(board()).rejects.toThrow();
});
