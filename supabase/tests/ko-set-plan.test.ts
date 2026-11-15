import type { PGlite } from '@electric-sql/pglite';
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { executeIntent } from '../../src/features/ko-account/data/execute';
import type { KoActor } from '../../src/features/ko-account/data/account';
import { verifyApproval } from '../../src/features/ko-account/data/approval';
import { TEST_NOW, asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let player: string;
const uuid = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const secret = 'ko-set-plan-test-key-123456789012345';
const original = [{ reps_min: 8, reps_max: 12, rir: 2 }, { reps_min: 6, reps_max: 10, rir: 1 }];
let sequence = 100;

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  await db.query('insert into security_private.ko_approval_config(signing_key) values ($1)', [secret]);
  await db.query("insert into public.exercises(id,name_en,body_part) values ($1,'Squat','legs')", [uuid(1)]);
  await db.query(`insert into public.programs(id,captain_id,player_id,title,status)
    values ($1,$2,$3,'Training','active')`, [uuid(2), captain, player]);
  await db.query("insert into public.program_days(id,program_id,title,position) values ($1,$2,'Legs',1)", [uuid(3), uuid(2)]);
});
afterAll(async () => db?.close());

async function fixture(plan: typeof original | null = original) {
  const id = uuid(sequence++);
  await db.query(`insert into public.program_exercises(id,day_id,exercise_id,position,sets,reps_min,reps_max,set_plan)
    values ($1,$2,$3,$4,2,8,12,$5)`, [id, uuid(3), uuid(1), sequence, plan === null ? null : JSON.stringify(plan)]);
  return id;
}
function apply(id: string, changes: object, previousSetPlan: typeof original | null = original) {
  const payload = { id, previousSets: 2, previousReps: 8, previousMax: 12, previousSetPlan, ...changes };
  const body = Buffer.from(JSON.stringify({ actor: captain, id: uuid(sequence++), player,
    kind: 'exercise', payload, expires: Date.parse(TEST_NOW) + 60_000 })).toString('base64url');
  const token = body + '.' + createHmac('sha256', secret).update(body).digest('hex');
  return asUser(db, captain, tx => tx.query('select public.ko_apply_action($1)', [token]));
}
async function read(id: string) {
  return (await asUser(db, player, tx => tx.query('select sets,reps_min,reps_max,set_plan from public.program_exercises where id=$1', [id]))).rows[0];
}

it('grows a plan by repeating its last entry', async () => {
  const id = await fixture();
  await apply(id, { sets: 3 });
  expect(await read(id)).toEqual({ sets: 3, reps_min: 8, reps_max: 12, set_plan: [...original, original[1]] });
});
it('truncates a plan when sets shrink', async () => {
  const id = await fixture();
  await apply(id, { sets: 1 });
  expect(await read(id)).toMatchObject({ sets: 1, set_plan: [original[0]] });
});
it('updates every rep target and preserves each entry RIR', async () => {
  const id = await fixture();
  await apply(id, { reps: 15 });
  expect(await read(id)).toEqual({ sets: 2, reps_min: 15, reps_max: null, set_plan: [
    { reps_min: 15, reps_max: null, rir: 2 }, { reps_min: 15, reps_max: null, rir: 1 },
  ] });
});
it('resizes and changes reps together while keeping null plans null', async () => {
  const id = await fixture();
  await apply(id, { sets: 1, reps: 9 });
  expect(await read(id)).toMatchObject({ sets: 1, set_plan: [{ reps_min: 9, reps_max: null, rir: 2 }] });
  const legacy = await fixture(null);
  await apply(legacy, { sets: 3, reps: 9 }, null);
  expect(await read(legacy)).toEqual({ sets: 3, reps_min: 9, reps_max: null, set_plan: null });
});
it('rejects a confirmation when only the per-set plan changed', async () => {
  const id = await fixture();
  const changed = [{ reps_min: 8, reps_max: 12, rir: 0 }, original[1]];
  await db.query('update public.program_exercises set set_plan=$2 where id=$1', [id, JSON.stringify(changed)]);
  await expect(apply(id, { reps: 15 })).rejects.toMatchObject({ code: '40001' });
  expect(await read(id)).toMatchObject({ reps_min: 8, set_plan: changed });
});

it('includes the per-set snapshot in the signed KO preview', async () => {
  const id = uuid(900);
  const prescription = { id, sets: 2, reps_min: 8, reps_max: 12 };
  const actor = { id: captain, role: 'captain', db: { from: (table: string) => {
    const query = { select: () => query, eq: () => query,
      maybeSingle: async () => ({ error: null, data: { program_days: [{ title: 'Legs', program_exercises: [
        { ...prescription, exercises: { name_en: 'Squat', name_ar: null, instructions_ar: [], instructions_en: [] } },
      ] }] } }),
      single: async () => {
        expect(table).toBe('program_exercises');
        return { error: null, data: { ...prescription, set_plan: original } };
      },
    };
    return query;
  } } } as unknown as KoActor;
  const now = Date.parse(TEST_NOW);
  const result = await executeIntent(actor, { kind: 'update_exercise', args: { exercise: 'Squat', reps: 15 } },
    'en', secret, now, { id: player, name: 'Player' });
  expect(result.kind).toBe('confirm');
  if (result.kind !== 'confirm') throw new Error('Expected KO confirmation');
  expect(verifyApproval(result.token, captain, now, secret)?.payload).toEqual({
    id, sets: null, reps: 15, previousSets: 2, previousReps: 8, previousMax: 12, previousSetPlan: original,
  });
});
