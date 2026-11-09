import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';
import { generateProgram, toProgramDraft } from '../../src/features/program-generator/generate';
import type { Candidate } from '../../src/features/program-generator/pick';
import type { GeneratorBrief } from '../../src/features/program-generator/brief';

let db: PGlite;
let captain: string;
let exercise: string;
const source: { dataset_id: string; name_en: string; body_part: string }[] =
  JSON.parse(readFileSync('supabase/seed/source/exercises-gif.json', 'utf8'));

beforeAll(async () => {
  db = await createTestDb();
  for (const row of source) await db.query(`insert into public.exercises
      (dataset_id, name_en, body_part) values ($1, $2, $3) on conflict do nothing`,
    [row.dataset_id, row.name_en, row.body_part]);
  captain = await createUser(db, 'captain');
  const rows = await db.query<{ exercise_id: string }>('select exercise_id from public.exercise_generator_tags limit 1');
  exercise = rows.rows[0]?.exercise_id ?? '';
});
afterAll(async () => { await db?.close(); });

it('seeds the actual catalog and allows authenticated read only', async () => {
  const result = await asUser(db, captain, tx => tx.query('select * from public.exercise_generator_tags'));
  expect(result.rows.length).toBeGreaterThanOrEqual(120);
  for (const sql of [
    `insert into public.exercise_generator_tags select * from public.exercise_generator_tags limit 1`,
    `update public.exercise_generator_tags set min_level = 'advanced'`,
    `delete from public.exercise_generator_tags`,
  ]) await expect(asUser(db, captain, tx => tx.query(sql))).rejects.toMatchObject({ code: '42501' });
});

it('denies anon and suspended callers', async () => {
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    return tx.query('select * from public.exercise_generator_tags');
  })).rejects.toMatchObject({ code: '42501' });
  await db.query('update public.profiles set suspended_at = now() where id = $1', [captain]);
  expect((await asUser(db, captain, tx => tx.query('select * from public.exercise_generator_tags'))).rows).toEqual([]);
  await db.query('update public.profiles set suspended_at = null where id = $1', [captain]);
});

it('removes tags when globals become custom without blocking existing catalog maintenance', async () => {
  await db.query('update public.exercises set owner_id = $1 where id = $2', [captain, exercise]);
  expect((await db.query('select * from public.exercise_generator_tags where exercise_id = $1', [exercise])).rows).toEqual([]);
  await db.query('update public.exercises set owner_id = null where id = $1', [exercise]);
  expect((await db.query('select * from public.exercise_generator_tags where exercise_id = $1', [exercise])).rows).toHaveLength(1);
});

it('prevents tagging custom exercises', async () => {
  const custom = await db.query<{ id: string }>(`insert into public.exercises(owner_id,name_en,body_part)
    values ($1,'Custom','chest') returning id`, [captain]);
  await expect(db.query(`insert into public.exercise_generator_tags
    (exercise_id,pattern,kind,equipment,min_level) values ($1,'h_push','compound','gym','beginner')`,
  [custom.rows[0]?.id])).rejects.toMatchObject({ code: '23514' });
});

it('enforces tag vocabularies and stress bounds', async () => {
  for (const patch of ["pattern = 'unknown'", "equipment = 'barbell'", "kind = 'other'",
    "min_level = 'expert'", "stress = array['elbow']", 'stress = array[null]::text[]']) {
    await expect(db.query(`update public.exercise_generator_tags set ${patch} where exercise_id = $1`, [exercise]))
      .rejects.toMatchObject({ code: '23514' });
  }
});

it('fills injured four-day beginner weeks using the actual persisted seed tags', async () => {
  const tags = await asUser(db, captain, tx => tx.query<Omit<Candidate, 'usage' | 'library'>>(
    'select * from public.exercise_generator_tags'));
  const candidates = tags.rows.map(row => ({ ...row, usage: 0, library: null }));
  const byId = new Map(candidates.map(row => [row.exercise_id, row]));
  const injuryCases: GeneratorBrief['injuries'][] = [[], ['knee'], ['shoulder'], ['lower_back'], ['knee', 'lower_back']];
  for (const equipment of ['bodyweight', 'dumbbells', 'gym']) for (const injuries of injuryCases) {
    const result = generateProgram({ goal: 'fat_loss', level: 'beginner', weekdays: [0, 1, 2, 3],
      minutes: 90, equipment, injuries, seed: 42 }, candidates);
    expect(result.error, `${equipment}/${injuries.join(',')}`).toBeUndefined();
    if (result.error) throw new Error(result.error.code);
    for (const row of result.data.days.flatMap(day => day.exercises)) {
      for (const id of [row.exercise_id, ...row.alternatives])
        expect(byId.get(id)?.stress.some(stress => injuries.includes(stress))).toBe(false);
    }
  }
});

it('saves an accepted generated week through the existing weekly builder RPC', async () => {
  const tags = await db.query<Omit<Candidate, 'usage' | 'library'>>('select * from public.exercise_generator_tags');
  const result = generateProgram({ goal: 'strength', level: 'advanced', weekdays: [0, 2, 4],
    minutes: 90, equipment: 'gym', injuries: [], seed: 42 },
  tags.rows.map(row => ({ ...row, usage: 0, library: null })));
  if (result.error) throw new Error(result.error.code);
  let sequence = 0;
  const program = await asUser(db, captain, tx => tx.query<{ id: string }>(
    `insert into public.programs(captain_id,is_template,title) values ($1,true,'Generated') returning id`, [captain]));
  const programId = program.rows[0]?.id;
  if (!programId) throw new Error('Program creation failed');
  const draft = toProgramDraft(result.data, programId, 'Generated',
    () => `00000000-0000-7000-8000-${String(sequence++).padStart(12, '0')}`);
  await asUser(db, captain, tx => tx.query('select public.save_weekly_program($1::jsonb)', [JSON.stringify(draft)]));
  expect((await db.query('select * from public.program_days where program_id=$1', [draft.id])).rows).toHaveLength(7);
  expect((await db.query(`select e.* from public.program_exercises e join public.program_days d on d.id=e.day_id
    where d.program_id=$1`, [draft.id])).rows).toHaveLength(24);
});
