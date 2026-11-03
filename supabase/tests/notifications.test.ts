import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let other: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
});
afterAll(async () => { await db.close(); });

it('notifies the captain when a player joins', async () => {
  const result = await asUser(db, captain, tx => tx.query('select type, payload from public.notifications'));
  expect(result.rows).toEqual([{ type: 'player_joined', payload: { player_id: player, name: 'player' } }]);
});
it('notifies on program activation, but not draft edits or unrelated active edits', async () => {
  const { rows } = await db.query<{ id: string }>(`insert into public.programs (captain_id, player_id, title)
    values ($1, $2, 'Strength') returning id`, [captain, player]);
  const id = rows[0]?.id;
  await db.query("update public.programs set status = 'active' where id = $1", [id]);
  await db.query("update public.programs set title = 'Updated' where id = $1", [id]);
  expect((await asUser(db, player, tx => tx.query("select payload from public.notifications where type = 'plan_assigned'"))).rows)
    .toEqual([{ payload: { plan_id: id, name: 'Strength' } }]);
});
it('coalesces active nutrition target updates, then notifies again after reading', async () => {
  const { rows } = await db.query<{ id: string }>(`insert into public.nutrition_plans
    (captain_id, player_id, title, status, target_kcal) values ($1, $2, 'Meals', 'active', 2000) returning id`, [captain, player]);
  const id = rows[0]?.id;
  await db.query('update public.nutrition_plans set target_kcal = 2200 where id = $1', [id]);
  const query = () => db.query("select * from public.notifications where type = 'nutrition_updated'");
  expect((await query()).rows).toHaveLength(1);
  await asUser(db, player, tx => tx.query("update public.notifications set is_read = true where type = 'nutrition_updated'"));
  await db.query('update public.nutrition_plans set target_protein = 160 where id = $1', [id]);
  expect((await query()).rows).toHaveLength(2);
});
it('isolates reads and updates and grants only the read flag', async () => {
  expect((await asUser(db, other, tx => tx.query('select * from public.notifications'))).rows).toEqual([]);
  expect((await asUser(db, other, tx => tx.query('update public.notifications set is_read = true returning id'))).rows).toEqual([]);
  await expect(asUser(db, player, tx => tx.query("update public.notifications set payload = '{}'")))
    .rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, player, tx => tx.query("insert into public.notifications (user_id, type) values ($1, 'plan_assigned')", [player])))
    .rejects.toMatchObject({ code: '42501' });
});
it('uses local calendar dates and does not duplicate inactivity alerts', async () => {
  await db.query("update public.coach_clients set started_on = '2026-10-25' where captain_id = $1", [captain]);
  await db.query(`insert into public.workout_sessions (id, player_id, training_date, started_at, client_updated_at)
    values (gen_random_uuid(), $1, '2026-10-31', now(), now())`, [player]);
  await db.query("update public.profiles set timezone = 'Pacific/Pago_Pago' where id = $1", [captain]);
  const refresh = () => asUser(db, captain, tx => tx.query('select public.refresh_inactive_alerts()'));
  await refresh();
  expect((await db.query("select id from public.notifications where type = 'player_inactive'")).rows).toHaveLength(0);
  await db.query("update public.profiles set timezone = 'Africa/Cairo' where id = $1", [captain]);
  await refresh();
  await refresh();
  expect((await db.query("select payload from public.notifications where type = 'player_inactive'")).rows)
    .toEqual([{ payload: { player_id: player, name: 'player' } }]);
});
it('cannot refresh for another captain, or as a player', async () => {
  await asUser(db, other, tx => tx.query('select public.refresh_inactive_alerts()'));
  expect((await db.query("select id from public.notifications where user_id = $1 and type = 'player_inactive'", [other])).rows).toEqual([]);
  await expect(asUser(db, other, tx => tx.query('select public.refresh_inactive_alerts($1)', [captain])))
    .rejects.toMatchObject({ code: '42883' });
  await expect(asUser(db, player, tx => tx.query('select public.refresh_inactive_alerts()')))
    .rejects.toMatchObject({ code: '42501' });
});
it('denies suspended callers and anonymous access', async () => {
  await db.query('update public.profiles set suspended_at = now() where id = $1', [captain]);
  expect((await asUser(db, captain, tx => tx.query('select id from public.notifications'))).rows).toEqual([]);
  await expect(asUser(db, captain, tx => tx.query('select public.refresh_inactive_alerts()')))
    .rejects.toMatchObject({ code: '42501' });
  await db.query('update public.profiles set suspended_at = null where id = $1', [captain]);
  expect((await db.query(`select has_table_privilege('anon', 'public.notifications', 'select') as allowed`)).rows)
    .toEqual([{ allowed: false }]);
});
it('does not alert for recent joins, archived players, expired access, or recent workouts', async () => {
  await db.query("delete from public.notifications where type = 'player_inactive'");
  const refresh = () => asUser(db, captain, tx => tx.query('select public.refresh_inactive_alerts()'));
  await db.query("update public.coach_clients set started_on = '2026-11-02' where captain_id = $1", [captain]);
  await refresh();
  await db.query("update public.coach_clients set started_on = '2026-10-25', archived_at = now() where captain_id = $1", [captain]);
  await refresh();
  await db.query("update public.coach_clients set archived_at = null, access_until = '2026-11-02' where captain_id = $1", [captain]);
  await refresh();
  await db.query("update public.coach_clients set access_until = '2026-12-01' where captain_id = $1", [captain]);
  await db.query("update public.workout_sessions set training_date = '2026-11-02' where player_id = $1", [player]);
  await refresh();
  expect((await db.query("select id from public.notifications where type = 'player_inactive'")).rows).toHaveLength(0);
});
it('aggregates global KPIs only for an admin and excludes expired subscriptions', async () => {
  await expect(asUser(db, captain, tx => tx.query('select * from public.admin_notification_kpis()')))
    .rejects.toMatchObject({ code: '42501' });
  await makeAdmin(db, other);
  await db.query(`insert into public.captain_subscriptions (captain_id, tier, starts_at, ends_at, amount_egp, activated_by)
    values ($1, 'champion', '2026-11-01', '2026-12-01', 100, $2),
      ($2, 'legend', '2026-10-01', '2026-11-01', 100, $2)`, [captain, other]);
  expect((await asUser(db, other, tx => tx.query('select * from public.admin_notification_kpis()'))).rows)
    .toEqual([{ captains: 2, players: 1, paid_captains: 1 }]);
});
