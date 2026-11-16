import type { PGlite } from '@electric-sql/pglite';
import type { FleetCaptain } from './fleet-fixture';
import { asUser } from './harness';

export async function seedFleetContent(db: PGlite, captain: FleetCaptain) {
  const run = (sql: string, params: unknown[] = []) => asUser(db, captain.id, tx => tx.query<{ id: string }>(sql, params));
  for (const program of [true, false]) {
    const table = program ? 'programs' : 'nutrition_plans';
    const count = Math.floor(captain.index / 4) % (program ? 4 : 3);
    for (let i = 0; i < count; i++) {
      const result = await run(`insert into ${table}(captain_id,title,is_template)
        values($1,$2,true) returning id`, [captain.id, `Fleet template ${i}`]);
      const template = result.rows[0]?.id;
      if (!template) throw new Error('Missing fleet template');
      (program ? captain.programs : captain.plans).push(template);
      if (program) {
        const day = await run(`insert into program_days(program_id,position,title)
          values($1,1,'Training') returning id`, [template]);
        await run(`insert into program_cardio(day_id,position,kind,minutes,intensity)
          values($1,1,'Walk',20,'low')`, [day.rows[0]?.id]);
      }
      else await run("insert into meals(plan_id,position,name) values($1,1,'Breakfast')", [template]);
      if (i === 0) for (const player of captain.players.filter(p => p.state === 'active').slice(0, 3)) {
        await run(`select ${program ? 'assign_program_template' : 'assign_nutrition_template'}($1,$2) as id`, [template, player.id]);
      }
    }
  }
}
