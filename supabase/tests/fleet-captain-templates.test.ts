import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb } from './harness';
import { createFleet } from './fleet-fixture';
import type { Fleet } from './fleet-fixture';

let db: PGlite;
let fleet: Fleet;
beforeAll(async () => { db = await createTestDb(); fleet = await createFleet(db); });
afterAll(async () => { await db?.close(); });

it.each(Array.from({ length: 25 }, (_, i) => i))('captain %i creates both templates and assigns independent copies to one and many', async index => {
  const captain = fleet.captains[index];
  if (!captain) throw new Error('Missing captain');
  const run = (sql: string, params: unknown[] = []) => asUser(db, captain.id, tx => tx.query<{ id: string }>(sql, params));
  for (const program of [true, false]) {
    const table = program ? 'programs' : 'nutrition_plans';
    const child = program ? 'program_days' : 'meals';
    const foreignKey = program ? 'program_id' : 'plan_id';
    const column = program ? 'title' : 'name';
    const template = (await run(`insert into ${table}(captain_id,title,is_template)
      values($1,'Before',true) returning id`, [captain.id])).rows[0]?.id;
    if (!template) throw new Error('Missing template');
    await run(program ? `insert into program_days(program_id,position,title,is_rest_day) values($1,1,'Original',true)`
      : `insert into meals(plan_id,position,name) values($1,1,'Original')`, [template]);
    const assigned: string[] = [];
    for (const player of captain.players.slice(0, 5)) {
      const id = (await run(`select ${program ? 'assign_program_template' : 'assign_nutrition_template'}($1,$2) as id`,
        [template, player.id])).rows[0]?.id;
      if (!id) throw new Error('Missing assignment');
      assigned.push(id);
      expect((await run(`select id from ${table} where id=$1 and player_id=$2 and status='active'
        and source_template_id=$3`, [id, player.id, template])).rows).toHaveLength(1);
    }
    await run(`update ${table} set title='After' where id=$1`, [template]);
    await run(`update ${child} set ${column}='Edited' where ${foreignKey}=$1`, [template]);
    for (const id of assigned) {
      expect((await asUser(db, captain.id, tx => tx.query(`select title from ${table} where id=$1`, [id]))).rows)
        .toEqual([{ title: 'Before' }]);
      expect((await asUser(db, captain.id, tx => tx.query(`select ${column} as label from ${child} where ${foreignKey}=$1`, [id]))).rows)
        .toEqual([{ label: 'Original' }]);
    }
  }
});
