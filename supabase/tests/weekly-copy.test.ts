import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
const payload = { kind: 'workout', title: 'Weekly starter', notes: '', settings: { repeatWeekly: false }, days: [
  { title: 'Cardio', weekday: 0, is_rest_day: false, exercises: [],
    cardio: [{ kind: 'Walk', minutes: 25, intensity: 'low', notes: 'Easy' }] },
  ...Array.from({ length: 6 }, (_, index) => ({ title: '', weekday: index + 1, is_rest_day: true, exercises: [], cardio: [] })),
] };
beforeAll(async () => {
  db = await createTestDb();
  await db.query("update security_private.starter_templates set payload=$1 where key='beginner-full-body'", [JSON.stringify(payload)]);
});
afterAll(async () => { await db?.close(); });

it('copies weekly starter JSON, locks its cardio, and assigns an independent editable copy', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const starter = await db.query<{ id: string }>("select id from public.programs where captain_id=$1 and title='Weekly starter'", [captain]);
  const id = starter.rows[0]?.id;
  const rows = await db.query<{ id: string; day_id: string }>(`select c.id,c.day_id from public.program_cardio c
    join public.program_days d on d.id=c.day_id where d.program_id=$1`, [id]);
  expect(rows.rows).toHaveLength(1);
  for (const sql of ['update public.program_cardio set minutes=30 where id=$1', 'delete from public.program_cardio where id=$1']) {
    await expect(asUser(db, captain, tx => tx.query(sql, [rows.rows[0]?.id]))).rejects.toMatchObject({ code: '42501' });
  }
  await expect(asUser(db, captain, tx => tx.query(`insert into public.program_cardio(day_id,position,kind,minutes,intensity)
    values($1,2,'Run',10,'high')`, [rows.rows[0]?.day_id]))).rejects.toMatchObject({ code: '42501' });
  const assigned = await asUser(db, captain, tx => tx.query<{ id: string }>('select public.assign_program_template($1,$2) as id', [id, player]));
  const copy = assigned.rows[0]?.id;
  expect((await db.query(`select count(*)::int as n from public.program_days where program_id=$1 and weekday is not null`, [copy])).rows)
    .toEqual([{ n: 7 }]);
  const blocks = await asUser(db, player, tx => tx.query<{ id: string }>('select id from public.program_cardio'));
  expect(blocks.rows).toHaveLength(1);
  expect(blocks.rows[0]?.id).not.toBe(rows.rows[0]?.id);
  await asUser(db, captain, tx => tx.query('update public.program_cardio set minutes=35 where id=$1', [blocks.rows[0]?.id]));
  expect((await db.query('select minutes from public.program_cardio where id=$1', [rows.rows[0]?.id])).rows).toEqual([{ minutes: 25 }]);
  await db.query(`update public.programs set settings=settings || '{"weeklyStartedOn":"2026-10-01"}' where id=$1`, [copy]);
  await asUser(db, captain, tx => tx.query('select public.activate_program($1)', [copy]));
  expect((await db.query<{ settings: unknown }>('select settings from public.programs where id=$1', [copy])).rows[0]?.settings)
    .toMatchObject({ repeatWeekly: false, weeklyStartedOn: '2026-11-03' });
});

it('preserves weekly starter fields and cardio when the demo seeds players through assignment', async () => {
  const user = await createUser(db, 'player');
  await asUser(db, user, tx => tx.query('select public.create_demo_workspace()'), true);
  const programs = await db.query<{ id: string; settings: unknown }>(
    "select id,settings from public.programs where captain_id=$1 and title='Weekly starter' and not is_template", [user]);
  expect(programs.rows.length).toBeGreaterThan(0);
  for (const p of programs.rows) {
    expect(p.settings).toMatchObject({ repeatWeekly: false, weeklyStartedOn: '2026-11-03' });
    expect((await db.query(`select count(*)::int as n from public.program_days where program_id=$1 and is_rest_day`, [p.id])).rows)
      .toEqual([{ n: 6 }]);
    expect((await db.query(`select kind,minutes from public.program_cardio where day_id in
      (select id from public.program_days where program_id=$1)`, [p.id])).rows).toEqual([{ kind: 'Walk', minutes: 25 }]);
  }
});
