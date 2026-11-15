import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

async function fixture() {
  const users = await createCaptainWithPlayer(db);
  const link = (await db.query<{ id: string }>('update coach_clients set pending=true where player_id=$1 returning id', [users.player])).rows[0]?.id;
  if (!link) throw new Error('Missing link');
  return { ...users, link };
}
async function activate(captain: string, link: string, offer = false) {
  await asUser(db, captain, tx => tx.query(offer
    ? `select activate_player_offer($1,null,null,'days',30,800,800,false)`
    : `select activate_player($1,null,'days',30,800,800,false)`, [link]));
}
async function plan(table: 'programs' | 'nutrition_plans', captain: string, player: string | null, status = 'active', template = false) {
  const row = (await db.query<{ id: string }>(`insert into ${table}(captain_id,player_id,title,status,is_template)
    values($1,$2,'Plan',$3,$4) returning id`, [captain, player, status, template])).rows[0];
  if (!row) throw new Error('Missing plan');
  return row.id;
}
const state = async (link: string) => (await db.query<{
  access_until: string; billing_started_at: string; awaiting_plans_at: string | null; frozen_at: string | null;
}>(`select access_until::text,billing_started_at::text,awaiting_plans_at::text,frozen_at::text
  from coach_clients where id=$1`, [link])).rows[0];
const wait = (link: string) => db.query(`update coach_clients set awaiting_plans_at=now()-interval '5 days 23 hours' where id=$1`, [link]);
const start = (captain: string, link: string) => asUser(db, captain, tx => tx.query('select public.start_player_subscription($1)', [link]));

it.each([false, true])('activation waits with no plans, including offer path=%s', async offer => {
  const { captain, link } = await fixture();
  await activate(captain, link, offer);
  expect((await state(link))?.awaiting_plans_at).not.toBeNull();
});
it('activation with both active plans keeps the clock running', async () => {
  const { captain, player, link } = await fixture();
  await plan('programs', captain, player);
  await plan('nutrition_plans', captain, player);
  await activate(captain, link);
  expect((await state(link))?.awaiting_plans_at).toBeNull();
});
it.each(['programs', 'nutrition_plans'] as const)('starts on the second active plan through insert/update: %s first', async first => {
  const { captain, player, link } = await fixture();
  await activate(captain, link);
  await wait(link);
  await plan(first, captain, player);
  expect((await state(link))?.awaiting_plans_at).not.toBeNull();
  const second = first === 'programs' ? 'nutrition_plans' : 'programs';
  const id = await plan(second, captain, player, 'draft');
  const before = await state(link);
  await db.query(`update ${second} set status='active' where id=$1`, [id]);
  expect((await state(link))?.awaiting_plans_at).toBeNull();
  expect((await db.query(`select access_until=$2::date+5 as shifted,billing_started_at=now() as started from coach_clients where id=$1`, [link, before?.access_until])).rows).toEqual([{ shifted: true, started: true }]);
  expect((await db.query(`select period_start=public.user_today($1)+5 as shifted_start,
    period_end=$3::date+5 as shifted_end from player_payments where player_id=$2`, [captain, player, before?.access_until])).rows)
    .toEqual([{ shifted_start: true, shifted_end: true }]);
});
it('templates and another captain’s plans do not start the subscription', async () => {
  const { captain, player, link } = await fixture();
  await activate(captain, link);
  await plan('programs', captain, player);
  await plan('nutrition_plans', captain, null, 'active', true);
  await plan('nutrition_plans', await createUser(db, 'captain'), player);
  expect((await state(link))?.awaiting_plans_at).not.toBeNull();
});
it('starts when the second active plan is inserted and preserves earlier payment periods', async () => {
  const { captain, player, link } = await fixture();
  await activate(captain, link);
  const previous = (await db.query<{ id: string }>(`insert into player_payments(captain_id,player_id,days,period_start,period_end,created_at)
    values($1,$2,7,'2026-10-01','2026-10-08','2026-10-01') returning id`, [captain, player])).rows[0]?.id;
  await wait(link);
  await plan('nutrition_plans', captain, player);
  await plan('programs', captain, player);
  expect((await state(link))?.awaiting_plans_at).toBeNull();
  expect((await db.query(`select period_start::text,period_end::text from player_payments where id=$1`, [previous])).rows)
    .toEqual([{ period_start: '2026-10-01', period_end: '2026-10-08' }]);
});
it('RPC authorizes only the active owner link and is idempotent', async () => {
  const { captain, player, link } = await fixture();
  await expect(start(captain, link)).rejects.toMatchObject({ code: '42501' });
  await activate(captain, link);
  await wait(link);
  for (const caller of [player, await createUser(db, 'captain')]) {
    await expect(start(caller, link)).rejects.toMatchObject({ code: '42501' });
  }
  await start(captain, link);
  const once = await state(link);
  await start(captain, link);
  expect(await state(link)).toEqual(once);
  await db.query('update coach_clients set archived_at=now() where id=$1', [link]);
  await expect(start(captain, link)).rejects.toMatchObject({ code: '42501' });
});
it('does not charge PT credit or send expiry reminders while awaiting', async () => {
  const { captain, player, link } = await fixture();
  await activate(captain, link);
  await db.query(`update coach_clients set sessions_left=3,access_until=public.user_today(captain_id)+3 where id=$1`, [link]);
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,'2026-11-03',$2,$2,$2)`, [player, TEST_NOW]);
  await db.exec('select public.queue_expiry_reminders()');
  expect((await db.query('select sessions_left from coach_clients where id=$1', [link])).rows).toEqual([{ sessions_left: 3 }]);
  expect((await db.query(`select id from notifications where payload->>'link_id'=$1`, [link])).rows).toHaveLength(0);
});
it.each([true, false])('counts overlapping freeze/wait days once, unfreeze first=%s', async unfreezeFirst => {
  const { captain, link } = await fixture();
  await activate(captain, link);
  await wait(link);
  await asUser(db, captain, tx => tx.query('select set_player_frozen($1,true)', [link]));
  await db.query(`update coach_clients set frozen_at=now()-interval '3 days' where id=$1`, [link]);
  const before = await state(link);
  if (unfreezeFirst) await asUser(db, captain, tx => tx.query('select set_player_frozen($1,false)', [link]));
  await start(captain, link);
  if (!unfreezeFirst) await asUser(db, captain, tx => tx.query('select set_player_frozen($1,false)', [link]));
  expect((await db.query('select access_until=$2::date+5 as once from coach_clients where id=$1', [link, before?.access_until])).rows).toEqual([{ once: true }]);
});
it('existing null rows keep charging credits and sending reminders', async () => {
  const { player } = await createCaptainWithPlayer(db);
  await db.query(`update coach_clients set sessions_left=3,access_until=public.user_today(captain_id)+3,
    billing_started_at=now()-interval '1 hour' where player_id=$1`, [player]);
  await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,completed_at,client_updated_at)
    values(gen_random_uuid(),$1,'2026-11-03',$2,$2,$2)`, [player, TEST_NOW]);
  await db.exec('select public.queue_expiry_reminders()');
  expect((await db.query('select sessions_left from coach_clients where player_id=$1', [player])).rows).toEqual([{ sessions_left: 2 }]);
  expect((await db.query(`select id from notifications where user_id=$1 and type='subscription_expiring'`, [player])).rows).toHaveLength(1);
});
it('revokes all private entry points and anonymous public access', async () => {
  expect((await db.query(`select has_function_privilege('authenticated','security_private.start_player_subscription(uuid)','execute') as private,
    has_function_privilege('authenticated','security_private.start_subscription_when_plans_ready()','execute') as trigger,
    has_function_privilege('anon','public.start_player_subscription(uuid)','execute') as anon`)).rows).toEqual([{ private: false, trigger: false, anon: false }]);
});
