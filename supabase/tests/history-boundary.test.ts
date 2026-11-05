import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { uuidv7 } from '../../src/core/offline/ids';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';
import { playerContent } from './fleet-player-content';

let db: PGlite;
let player: string, oldCaptain: string, captain: string;
const histories: Record<string, string[]> = {};
const startedOn = '2026-11-03';
const since = '2026-11-02T22:00:00Z'; // Cairo midnight at the start of started_on.
const id = () => uuidv7(Date.parse(TEST_NOW));
const run = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));

beforeAll(async () => {
  db = await createTestDb();
  ({ captain: oldCaptain, player } = await createCaptainWithPlayer(db, '2026-11-02'));
  captain = await createUser(db, 'captain');
  const content = await playerContent(db, {
    id: player, captain: oldCaptain, link: id(), state: 'active', kind: 'days', joinedBy: 'invite',
  });
  const insert = async (table: string, values: Record<string, unknown>) => {
    const row = { id: id(), player_id: player, ...values };
    const columns = Object.keys(row);
    await db.query(`insert into ${table}(${columns.join(',')}) values (${columns.map((_, i) => `$${i + 1}`).join(',')})`, Object.values(row));
    (histories[table] ??= []).push(row.id);
    return row.id;
  };
  for (const [date, time] of [['2026-11-02', '2026-11-02T21:59:59Z'], [startedOn, since]]) {
    const session = await insert('workout_sessions', {
      training_date: date, started_at: time, client_updated_at: TEST_NOW, session_rpe: 7, player_note: 'Feedback',
    });
    await insert('set_logs', { session_id: session, exercise_id: content.exercise, set_index: 1,
      completed_at: TEST_NOW, client_updated_at: TEST_NOW });
    await insert('meal_logs', { meal_id: content.meal, log_date: date, client_updated_at: TEST_NOW });
    await insert('supplement_logs', { supplement_id: content.supplement, log_date: date,
      taken_at: TEST_NOW, client_updated_at: TEST_NOW });
    await insert('daily_checks', { log_date: date, client_updated_at: TEST_NOW });
    const scan = id(), photo = `${player}/${id()}.jpg`, video = `${player}/${id()}.mp4`;
    await insert('body_scans', { scan_date: date, weight_kg: 80, file_path: `${player}/${scan}.pdf` });
    await insert('check_ins', { captain_id: oldCaptain, week_start: date, photo_paths: [photo] });
    await insert('form_checks', { captain_id: oldCaptain, exercise_id: content.exercise, video_path: video, created_at: time });
    await insert('readiness_decisions', { captain_id: captain, decision_date: date, decision: 'keep' });
    for (const [bucket, name] of [['body-scans', `${player}/${scan}.pdf`], ['checkin-photos', photo], ['form-videos', video]] as const) {
      const result = await db.query<{ id: string }>('insert into storage.objects(bucket_id,name) values ($1,$2) returning id', [bucket, name]);
      const object = result.rows[0];
      if (!object) throw new Error('Missing storage object');
      (histories[bucket] ??= []).push(object.id);
    }
  }
  await db.query('update coach_clients set archived_at=$1 where player_id=$2', [since, player]);
  await db.query(`insert into coach_clients(captain_id,player_id,access_until,started_on,created_at)
    values ($1,$2,'2026-12-03',$3,$4)`, [captain, player, startedOn, TEST_NOW]);
  // Route post-move inbox items to the new captain, as the insert trigger does.
  for (const table of ['check_ins', 'form_checks']) {
    await db.exec(`alter table ${table} disable trigger ${table === 'check_ins' ? 'check_ins_review' : 'form_checks_review'}`);
    await db.query(`update ${table} set captain_id=$1 where id=$2`, [captain, histories[table]?.[1]]);
    await db.exec(`alter table ${table} enable trigger ${table === 'check_ins' ? 'check_ins_review' : 'form_checks_review'}`);
  }
});
afterAll(async () => { await db?.close(); });

for (const table of ['workout_sessions', 'set_logs', 'meal_logs', 'supplement_logs', 'daily_checks',
  'body_scans', 'check_ins', 'form_checks', 'readiness_decisions', 'body-scans', 'checkin-photos', 'form-videos']) {
  it(`bounds ${table} by the current relationship while preserving player history`, async () => {
    const ids = histories[table];
    if (!ids) throw new Error('Missing history');
    const relation = table.includes('-') ? 'storage.objects' : table;
    const sql = `select id from ${relation} where id = any($1::uuid[]) order by id`;
    expect((await run(captain, sql, [ids])).rows).toEqual([{ id: ids[1] }]);
    expect((await run(player, sql, [ids])).rows).toEqual(ids.map(value => ({ id: value })).sort((a, b) => a.id.localeCompare(b.id)));
    expect((await run(oldCaptain, sql, [ids])).rows).toEqual([]);
  });
}

it('keeps profile basics visible and uses the indexed active link after renewal', async () => {
  expect((await run(captain, 'select id from profiles where id=$1', [player])).rows).toEqual([{ id: player }]);
  await db.query('update coach_clients set billing_started_at=$1 where player_id=$2 and archived_at is null', [TEST_NOW, player]);
  expect((await run(captain, 'select captain_since($1) as since', [player])).rows).toEqual([{ since: new Date(since) }]);
  expect((await db.query(`select has_function_privilege('anon','public.captain_since(uuid)','execute') as allowed`)).rows)
    .toEqual([{ allowed: false }]);
  expect((await db.query<{ indexdef: string }>(`select indexdef from pg_indexes where indexname='coach_clients_one_active_captain'`)).rows[0]?.indexdef)
    .toContain('(player_id) WHERE (archived_at IS NULL)');
});

it('can reapply policy changes without changing policy roles or restrictive suspension guards', async () => {
  const sql = readFileSync('supabase/migrations/0066_history_boundary.sql', 'utf8');
  await db.exec(sql.replace('create function public.captain_since', 'create or replace function public.captain_since'));
  const result = await db.query(`select count(*)::int as count from pg_policies where schemaname='public'
    and tablename=any($1::text[]) and policyname='active_caller' and permissive='RESTRICTIVE'
    and roles=array['authenticated']::name[]`, [Object.keys(histories).filter(name => !name.includes('-'))]);
  expect(result.rows).toEqual([{ count: 9 }]);
});
