import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string, player: string, other: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
});
afterAll(async () => { await db?.close(); });

it.each(['programs', 'nutrition_plans'])('creates and saves a blank %s template under RLS', async table => {
  const result = await asUser(db, captain, tx => tx.query<{ id: string }>(
    `insert into public.${table}(captain_id,player_id,is_template,title) values($1,null,true,'Blank') returning id`, [captain]));
  const id = result.rows[0]?.id;
  const draft = table === 'programs' ? { id, player_id: null, title: 'Edited', days: [] }
    : { title: 'Edited', targets: { kcal: 2000, protein: 150, carbs: 225, fat: 56 }, meals: [] };
  const save = (user: string) => asUser(db, user, tx => table === 'programs'
    ? tx.query('select public.save_weekly_program($1)', [JSON.stringify(draft)])
    : tx.query('select public.save_nutrition_plan($1,$2)', [id, JSON.stringify(draft)]));
  await save(captain);
  expect((await db.query(`select title,player_id,is_template from public.${table} where id=$1`, [id])).rows)
    .toEqual([{ title: 'Edited', player_id: null, is_template: true }]);
  for (const user of [other, player]) await expect(save(user)).rejects.toMatchObject({ code: '42501' });
  await db.query('update public.profiles set suspended_at=now() where id=$1', [captain]);
  await expect(save(captain)).rejects.toMatchObject({ code: '42501' });
  await db.query('update public.profiles set suspended_at=null where id=$1', [captain]);
});

it('does not let an assigned program be saved with a null player', async () => {
  const result = await db.query<{ id: string }>(
    "insert into public.programs(captain_id,player_id,title) values($1,$2,'Assigned') returning id", [captain, player]);
  await expect(asUser(db, captain, tx => tx.query('select public.save_weekly_program($1)',
    [JSON.stringify({ id: result.rows[0]?.id, player_id: null, title: 'Wrong', days: [] })])))
    .rejects.toMatchObject({ code: '42501' });
});
