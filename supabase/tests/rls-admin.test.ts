import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let admin: string;
let captain: string;
beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, 'captain', 'Owner');
  captain = await createUser(db, 'captain', 'Captain%_Name');
  await makeAdmin(db, admin);
});
afterAll(async () => { await db?.close(); });

const activate = (user: string, target: string, tier = 'legend', months = 1) =>
  asUser(db, user, (tx) => tx.query('select public.admin_activate_plan($1, $2, $3, $4)',
    [target, tier, months, 'cash']));
const suspend = (user: string, target: string, value: boolean) =>
  asUser(db, user, (tx) => tx.query('select public.admin_set_suspended($1, $2, $3)', [target, value, 'review']));

it('denies non-admin RPCs and admin membership reads; audit RLS hides rows', async () => {
  for (const call of [() => activate(captain, captain), () => suspend(captain, captain, true),
    () => asUser(db, captain, (tx) => tx.query('select * from public.admin_captains()'))]) {
    await expect(call()).rejects.toMatchObject({ code: '42501' });
  }
  await expect(asUser(db, captain, (tx) => tx.query('select * from public.admins')))
    .rejects.toMatchObject({ code: '42501' });
  expect((await asUser(db, captain, (tx) => tx.query('select * from public.admin_audit_log'))).rows).toEqual([]);
});

it('activates legend and stacks early renewals with an audit record per activation', async () => {
  await activate(admin, captain);
  expect((await asUser(db, captain, (tx) => tx.query('select public.current_tier($1) as tier', [captain]))).rows)
    .toEqual([{ tier: 'legend' }]);
  expect((await db.query('select * from public.admin_audit_log')).rows).toHaveLength(1);
  await activate(admin, captain);
  const { rows } = await db.query<{ amount_egp: number; stacked: boolean }>(`
    select amount_egp, starts_at = lag(ends_at) over (order by starts_at) as stacked
    from public.captain_subscriptions where captain_id = $1 order by starts_at`, [captain]);
  expect(rows.map((r) => r.amount_egp)).toEqual([699, 699]);
  expect(rows[1]?.stacked).toBe(true);
  expect((await asUser(db, admin, (tx) => tx.query('select * from public.admin_audit_log'))).rows).toHaveLength(2);
});

it('chooses the highest overlapping tier and excludes future and ended subscriptions', async () => {
  const coach = await createUser(db, 'captain');
  await db.transaction(async (tx) => {
    await tx.query(`insert into public.captain_subscriptions
      (captain_id, tier, starts_at, ends_at, amount_egp, activated_by) values
      ($1, 'champion', now(), now() + interval '1 month', 399, $2),
      ($1, 'legend', now(), now() + interval '1 month', 699, $2),
      ($1, 'empire', now() + interval '1 month', now() + interval '2 months', 1499, $2),
      ($1, 'empire', now() - interval '1 month', now(), 1499, $2)`, [coach, admin]);
    expect((await tx.query('select public.current_tier($1) as tier', [coach])).rows).toEqual([{ tier: 'legend' }]);
    await tx.query(`delete from public.captain_subscriptions where captain_id = $1 and tier in ('champion', 'legend')`, [coach]);
    expect((await tx.query('select public.current_tier($1) as tier', [coach])).rows).toEqual([{ tier: 'entry' }]);
  });
});

it('validates activations and prevents self suspension without audit side effects', async () => {
  for (const months of [0, 13]) await expect(activate(admin, captain, 'legend', months)).rejects.toThrow();
  await expect(activate(admin, captain, 'missing')).rejects.toThrow();
  await expect(activate(admin, await createUser(db, 'player'))).rejects.toThrow();
  await expect(suspend(admin, admin, true)).rejects.toMatchObject({ code: '42501' });
  expect((await db.query('select * from public.admin_audit_log')).rows).toHaveLength(2);
});

it('enforces entry limits, permits champion, and preserves active players after expiry', async () => {
  const coach = await createUser(db, 'captain');
  const add = async () => {
    const player = await createUser(db, 'player');
    return db.query(`insert into public.coach_clients
      (captain_id, player_id, access_until) values ($1, $2, current_date + 30)`, [coach, player]);
  };
  for (let i = 0; i < 5; i++) await add();
  await expect(add()).rejects.toMatchObject({ code: 'P0001' });
  await activate(admin, coach, 'champion');
  await add();
  await db.query(`update public.captain_subscriptions set starts_at = now() - interval '2 months',
    ends_at = now() - interval '1 day' where captain_id = $1`, [coach]);
  await expect(add()).rejects.toThrow(/5 active players/);
  expect((await db.query(`select * from public.coach_clients where captain_id = $1 and archived_at is null`, [coach])).rows)
    .toHaveLength(6);
  const result = await asUser(db, admin, (tx) => tx.query(`select * from public.admin_captains(null, 100, 0) where id = $1`, [coach]));
  const subscription = await db.query<{ ends_at: Date }>(`select ends_at from public.captain_subscriptions where captain_id = $1`, [coach]);
  expect(result.rows[0]).toMatchObject({ tier: 'entry', tier_ends_at: null,
    last_paid_tier: 'champion', last_paid_ends_at: subscription.rows[0]?.ends_at,
    active_players: 6, player_limit: 5, over_limit: true });
});

it('blocks suspended invites and profile tampering, then restores invites and audits both actions', async () => {
  const invite = () => asUser(db, captain, (tx) => tx.query(`insert into public.coach_invites
    (captain_id, access_until) values ($1, current_date + 30)`, [captain]));
  await invite();
  await suspend(admin, captain, true);
  await expect(invite()).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, captain, (tx) => tx.query('update public.profiles set suspended_at = null where id = $1', [captain])))
    .rejects.toMatchObject({ code: '42501' });
  await suspend(admin, captain, false);
  await invite();
  expect((await db.query(`select action, details->>'reason' as reason from public.admin_audit_log
    where action <> 'activate_plan' order by created_at`)).rows)
    .toEqual([{ action: 'suspend', reason: 'review' }, { action: 'unsuspend', reason: 'review' }]);
});

it('returns the latest paid history across all time, ignoring entry subscriptions', async () => {
  const coach = await createUser(db, 'captain', 'History');
  const list = () => asUser(db, admin, (tx) => tx.query(`select * from public.admin_captains('History')`));
  expect((await list()).rows[0]).toMatchObject({ last_paid_tier: null, last_paid_ends_at: null, over_limit: false });
  await db.query(`insert into public.captain_subscriptions
    (captain_id, tier, starts_at, ends_at, amount_egp, activated_by) values
    ($1, 'legend', '2026-01-01Z', '2026-02-01Z', 699, $2),
    ($1, 'champion', '2099-01-01Z', '2099-02-01Z', 399, $2),
    ($1, 'entry', '2099-02-01Z', '2099-03-01Z', 0, $2)`, [coach, admin]);
  expect((await list()).rows[0]).toMatchObject({ last_paid_tier: 'champion',
    last_paid_ends_at: new Date('2099-02-01T00:00:00Z') });
});

it('reads emails, escapes search metacharacters, sorts and caps pagination', async () => {
  await db.query('update auth.users set email = $2, email_confirmed_at = now() where id = $1', [captain, 'captain@example.com']);
  for (let i = 0; i < 101; i++) await createUser(db, 'captain', `Bulk ${i}`);
  const list = (search: string | null, limit = 50, offset = 0) => asUser(db, admin,
    (tx) => tx.query('select * from public.admin_captains($1, $2, $3)', [search, limit, offset]));
  const result = await list('%_');
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0]).toMatchObject({ id: captain, email: 'captain@example.com', email_confirmed: true,
    tier: 'legend', player_limit: 40, active_players: 0, suspended: false,
    last_paid_tier: 'legend', over_limit: false });
  expect((await list('CAPTAIN@EXAMPLE')).rows).toHaveLength(1);
  expect((await list(null, 500)).rows).toHaveLength(100);
  expect((await list('Bulk', 100, 100)).rows).toHaveLength(1);
});

it('isolates subscriptions, denies client writes, and enables RLS on all new tables', async () => {
  expect((await asUser(db, admin, (tx) => tx.query('select * from public.captain_subscriptions'))).rows).toHaveLength(0);
  expect((await asUser(db, captain, (tx) => tx.query('select * from public.captain_subscriptions'))).rows).toHaveLength(2);
  expect((await asUser(db, captain, (tx) => tx.query('select * from public.plan_tiers order by position'))).rows)
    .toMatchObject([{ tier: 'entry', price_egp: 0, player_limit: 5 }, { tier: 'champion', price_egp: 399, player_limit: 20 },
      { tier: 'legend', price_egp: 699, player_limit: 40 }, { tier: 'empire', price_egp: 1499, player_limit: 100 }]);
  for (const table of ['admins', 'plan_tiers', 'captain_subscriptions', 'admin_audit_log']) {
    expect((await db.query(`select rowsecurity from pg_tables where schemaname = 'public' and tablename = $1`, [table])).rows)
      .toEqual([{ rowsecurity: true }]);
    for (const privilege of ['INSERT', 'UPDATE', 'DELETE']) {
      expect((await db.query(`select has_table_privilege('authenticated', $1, $2) as allowed`, [`public.${table}`, privilege])).rows)
        .toEqual([{ allowed: false }]);
    }
  }
});

it('never grants anon function execution or client execution of trigger functions', async () => {
  for (const fn of ['is_admin()', 'is_suspended()', 'current_tier(uuid)',
    'admin_activate_plan(uuid,text,integer,text)', 'admin_set_suspended(uuid,boolean,text)',
    'admin_captains(text,integer,integer)', 'enforce_player_limit()', 'guard_profile_update()']) {
    expect((await db.query(`select has_function_privilege('anon', $1, 'EXECUTE') as allowed`, [`public.${fn}`])).rows)
      .toEqual([{ allowed: false }]);
  }
  for (const fn of ['enforce_player_limit()', 'guard_profile_update()']) {
    expect((await db.query(`select has_function_privilege('authenticated', $1, 'EXECUTE') as allowed`, [`public.${fn}`])).rows)
      .toEqual([{ allowed: false }]);
  }
});

it('captains cannot attach, reassign, or re-activate players directly', async () => {
  const coach = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  const stranger = await createUser(db, 'player');
  await expect(asUser(db, coach, (tx) => tx.query(`insert into public.coach_clients
    (captain_id, player_id, access_until) values ($1, $2, current_date + 30)`, [coach, stranger])))
    .rejects.toMatchObject({ code: '42501' });
  const { rows } = await db.query<{ id: string }>(`insert into public.coach_clients
    (captain_id, player_id, access_until) values ($1, $2, current_date + 30) returning id`, [coach, player]);
  const id = rows[0]?.id;
  const update = (set: string) => asUser(db, coach, (tx) => tx.query(`update public.coach_clients set ${set} where id = $1`, [id]));
  await expect(update(`player_id = '${stranger}'`)).rejects.toMatchObject({ code: '42501' });
  await update('access_until = current_date + 60');
  await update('archived_at = now()');
  await expect(update('archived_at = null')).rejects.toMatchObject({ code: '42501' });
});

it('a suspended captain’s existing invite cannot be redeemed', async () => {
  const coach = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  await db.query(`insert into public.coach_invites (captain_id, code, access_until) values ($1, 'paused-coach', current_date + 30)`, [coach]);
  await suspend(admin, coach, true);
  await expect(asUser(db, player, (tx) => tx.query(`select public.redeem_invite('paused-coach')`)))
    .rejects.toMatchObject({ code: '42501' });
  await suspend(admin, coach, false);
  await asUser(db, player, (tx) => tx.query(`select public.redeem_invite('paused-coach')`));
});
