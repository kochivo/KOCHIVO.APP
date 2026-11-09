import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { TEST_NOW, asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let other: string;
const id = '00000000-0000-7000-8000-000000000123';
const plan = '00000000-0000-7000-8000-000000000124';
const args = { id: plan, title: 'KO nutrition draft', targets: { kcal: 2000, protein: 120, carbs: 245, fat: 60 }, meals: [] };
const uuid = (value: number) => `00000000-0000-7000-8000-${String(value).padStart(12, '0')}`;
const secret = 'ko-test-signing-key-123456789012345';
const token = (actor: string, actionId: string, player: string, kind: string, payload: object) => {
  const body = Buffer.from(JSON.stringify({ actor, id: actionId, player, kind, payload, expires: Date.parse(TEST_NOW) + 60_000 })).toString('base64url');
  return body + '.' + createHmac('sha256', secret).update(body).digest('hex');
};

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  await db.query('insert into security_private.ko_approval_config(signing_key) values ($1)', [secret]);
});
afterAll(async () => db?.close());

const run = (actor: string, actionId: string, target: string, kind: string, payload: object) =>
  asUser(db, actor, tx => tx.query<{ result: unknown }>('select public.ko_apply_action($1) as result',
    [token(actor, actionId, target, kind, payload)]));

it('enforces the actual role and roster, rolls back failure and deduplicates confirmation', async () => {
  await expect(asUser(db, captain, tx => tx.query('select public.ko_apply_action($1)', ['unsigned']))).rejects.toThrow(/approval required/);
  await expect(asUser(db, other, tx => tx.query('select public.ko_apply_action($1)', [token(captain, id, player, 'nutrition', args)]))).rejects.toThrow(/approval required/);
  await expect(asUser(db, captain, tx => tx.query('insert into ko_private.ko_action_receipts(action_id) values ($1)', [id]))).rejects.toThrow(/permission denied/);
  await expect(run(player, id, player, 'nutrition', args)).rejects.toThrow(/captain/);
  await expect(run(other, id, player, 'nutrition', args)).rejects.toThrow(/relationship/);
  await expect(run(captain, id, player, 'nutrition', { ...args, meals: null })).rejects.toThrow();
  const saved = await run(captain, id, player, 'nutrition', args);
  expect(saved.rows[0]?.result).toEqual({ id: plan });
  expect((await run(captain, id, player, 'nutrition', args)).rows[0]?.result).toEqual({ replayed: true });
  expect((await db.query('select id from public.nutrition_plans where id=$1', [plan])).rows).toEqual([{ id: plan }]);
});

it('creates a draft, edits the selected exercise, detects stale values, and deduplicates reminders and renewals', async () => {
  const program = uuid(126);
  const day = uuid(127);
  const item = uuid(128);
  const otherItem = uuid(129);
  const catalog = uuid(130);
  await db.query("insert into public.exercises(id,name_en,body_part) values ($1,'Squat','legs')", [catalog]);
  const created = await run(captain, uuid(131), player, 'training', {
    id: program, title: 'Training', days: [{ id: day, program_id: program, title: 'Legs', position: 1, cardio: [],
      exercises: [item, otherItem].map((exercise, i) => ({ id: exercise, day_id: day, exercise_id: catalog,
        position: i + 1, sets: 4, reps_min: 8, reps_max: 12, rest_seconds: 90 })) }],
  });
  expect(created.rows[0]?.result).toEqual({ id: program });
  await asUser(db, captain, tx => tx.query('select public.activate_program($1)', [program]));
  const prescription = { id: item, previousSets: 4, previousReps: 8, previousMax: 12, sets: 3, reps: 10 };
  const saved = await run(captain, uuid(132), player, 'exercise', prescription);
  expect(saved.rows[0]?.result).toEqual({ sets: 3, reps: 10, max: null });
  await expect(run(captain, uuid(133), player, 'exercise', prescription)).rejects.toThrow(/prescription changed/);
  const rows = await asUser(db, player, tx => tx.query('select id,sets,reps_min from public.program_exercises where day_id=$1 order by position', [day]));
  expect(rows.rows).toEqual([{ id: item, sets: 3, reps_min: 10 }, { id: otherItem, sets: 4, reps_min: 8 }]);

  const date = '2026-11-03';
  await expect(asUser(db, captain, tx => tx.query('select ko_private.workout_reminder($1)', ['unsigned']))).rejects.toThrow(/approval required/);
  await expect(asUser(db, other, tx => tx.query('select ko_private.workout_reminder($1) as sent', [token(other, uuid(134), player, 'reminder', { date })])))
    .resolves.toMatchObject({ rows: [{ sent: false }] });
  expect((await run(captain, uuid(134), player, 'reminder', { date })).rows[0]?.result).toEqual({ sent: true });
  expect((await run(captain, uuid(135), player, 'reminder', { date })).rows[0]?.result).toEqual({ sent: false });
  const { rows: links } = await db.query<{ previous: string }>('select access_until::text as previous from public.coach_clients where player_id=$1', [player]);
  const renewal = { previous: links[0]?.previous, days: 14 };
  expect((await run(captain, uuid(136), player, 'renew', renewal)).rows[0]?.result).toHaveProperty('until');
  expect((await run(captain, uuid(136), player, 'renew', renewal)).rows[0]?.result).toEqual({ replayed: true });
  expect((await db.query('select days from public.player_payments where player_id=$1', [player])).rows).toEqual([{ days: 14 }]);
});
