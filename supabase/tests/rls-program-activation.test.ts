import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
async function program(captain: string, player: string | null, populated = true) {
  const result = await db.query<{ id: string }>(`insert into public.programs (captain_id, player_id, is_template, title)
    values ($1, $2, $2::uuid is null, 'Program') returning id`, [captain, player]);
  const id = result.rows[0]?.id;
  if (!id) throw new Error('fixture');
  if (populated) {
    await db.query(`with day as (insert into public.program_days (program_id, position) values ($1, 1) returning id),
      exercise as (insert into public.exercises (name_en, body_part) values ('Press', 'chest') returning id)
      insert into public.program_exercises (day_id, exercise_id, position, sets, reps_min)
      select day.id, exercise.id, 1, 3, 10 from day, exercise`, [id]);
  }
  return id;
}
it('activation archives the previous active program, and the index rejects a direct second active', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const old = await program(captain, player);
  const next = await program(captain, player);
  await asUser(db, captain, tx => tx.query('select public.activate_program($1)', [old]));
  await asUser(db, captain, tx => tx.query('select public.activate_program($1)', [next]));
  expect((await db.query('select status from public.programs where id = $1', [old])).rows).toEqual([{ status: 'archived' }]);
  expect((await db.query('select status from public.programs where id = $1', [next])).rows).toEqual([{ status: 'active' }]);
  await expect(asUser(db, captain, tx => tx.query("update public.programs set status = 'active' where id = $1", [old])))
    .rejects.toMatchObject({ code: '23505' });
});
it('rejects another captain and the player with 42501', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const id = await program(captain, player);
  const other = await createUser(db, 'captain');
  for (const caller of [other, player]) await expect(asUser(db, caller, tx => tx.query('select public.activate_program($1)', [id])))
    .rejects.toMatchObject({ code: '42501' });
});
it('rejects templates and empty programs with 22023 without archiving the current program', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const active = await program(captain, player);
  await asUser(db, captain, tx => tx.query('select public.activate_program($1)', [active]));
  for (const id of [await program(captain, null), await program(captain, player, false)]) {
    await expect(asUser(db, captain, tx => tx.query('select public.activate_program($1)', [id])))
      .rejects.toMatchObject({ code: '22023' });
  }
  expect((await db.query('select status from public.programs where id = $1', [active])).rows).toEqual([{ status: 'active' }]);
});
it('does not grant anon execute', async () => {
  expect((await db.query("select has_function_privilege('anon', 'public.activate_program(uuid)', 'execute') as allowed")).rows)
    .toEqual([{ allowed: false }]);
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    await tx.query('select public.activate_program(null)');
  })).rejects.toMatchObject({ code: '42501' });
});
it('assigning a template twice keeps exactly one active program for the player', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const template = await program(captain, null);
  for (let i = 0; i < 2; i++) await asUser(db, captain, tx => tx.query('select public.assign_program_template($1, $2)', [template, player]));
  expect((await db.query(`select count(*)::int as n from public.programs where player_id = $1 and status = 'active'`, [player])).rows)
    .toEqual([{ n: 1 }]);
  expect((await db.query(`select count(*)::int as n from public.programs where player_id = $1`, [player])).rows).toEqual([{ n: 2 }]);
});
