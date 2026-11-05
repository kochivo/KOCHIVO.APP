import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, makeAdmin } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let stranger: string;
let admin: string;
const exercise = '01900000-0000-7000-8000-000000000901';
const plan = '01900000-0000-7000-8000-000000000902';
const meal = '01900000-0000-7000-8000-000000000903';
const item = '01900000-0000-7000-8000-000000000904';
const food = '01900000-0000-7000-8000-000000000905';
const alternative = '01900000-0000-7000-8000-000000000906';
const reviewedAt = '2026-11-03T12:00:00Z';

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db, '2026-11-02'));
  stranger = await createUser(db, 'player');
  admin = await createUser(db, 'captain');
  await makeAdmin(db, admin);
  await db.query(`insert into public.exercises (id, name_en, name_ar, body_part)
    values ($1, 'Squat', 'سكوات', 'legs')`, [exercise]);
  await db.query(`insert into public.nutrition_plans (id, captain_id, player_id, title, status)
    values ($1, $2, $3, 'خطة', 'active')`, [plan, captain, player]);
  await db.query(`insert into public.foods
    (id, name_ar, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
    values ($1, 'أكل', 100, 10, 10, 2)`, [food]);
  await db.query(`insert into public.meals (id, plan_id, position, name) values ($1, $2, 0, 'وجبة')`, [meal, plan]);
  await db.query(`insert into public.meal_items (id, meal_id, food_id, grams, position)
    values ($1, $2, $3, 100, 0)`, [item, meal, food]);
  await db.query(`insert into public.meal_item_alternatives (id, meal_item_id, food_id, grams)
    values ($1, $2, $3, 100)`, [alternative, item, food]);
  await asUser(db, admin, (tx) => tx.query(
    `select public.admin_activate_plan($1, 'champion', 1, 'cash')`, [captain]));
});
afterAll(async () => { await db?.close(); });

describe('SEC-03 review fields start empty', () => {
  for (const table of ['check_ins', 'form_checks'] as const) {
    const insert = (review: string | null, reply: string | null, upsert = false) => asUser(db, player, (tx) => tx.query<{ id: string }>(
      table === 'check_ins'
        ? `insert into public.check_ins (captain_id, week_start, reviewed_at, captain_reply)
           values ($1, '2026-11-02', $2, $3) ${upsert ? 'on conflict (player_id, week_start) do nothing' : ''} returning id`
        : `insert into public.form_checks (captain_id, reviewed_at, captain_reply, exercise_id, video_path)
           values ($1, $2, $3, $4, $5) ${upsert ? 'on conflict (id) do nothing' : ''} returning id`,
      table === 'check_ins' ? [captain, review, reply] : [captain, review, reply, exercise, `${player}/squat.mp4`],
    ));
    it(`${table} rejects each forged field, including INSERT ON CONFLICT`, async () => {
      for (const upsert of [false, true]) {
        for (const [review, reply] of [[reviewedAt, null], [null, 'رد مزور'], [reviewedAt, 'رد مزور']] as const) {
          await expect(insert(review, reply, upsert)).rejects.toMatchObject({ code: '42501' });
        }
      }
      expect((await db.query(`select id from public.${table}`)).rows).toEqual([]);
    });
    it(`${table} accepts a clean insert and a subsequent captain review`, async () => {
      const result = await insert(null, null);
      const id = result.rows[0]?.id;
      expect(result.rows).toHaveLength(1);
      expect((await asUser(db, player, (tx) => tx.query(
        `select reviewed_at, captain_reply from public.${table} where id = $1`, [id],
      ))).rows).toEqual([{ reviewed_at: null, captain_reply: null }]);
      expect((await asUser(db, captain, (tx) => tx.query(
        `update public.${table} set reviewed_at = $2, captain_reply = 'كمل'
         where id = $1 returning captain_reply, reviewed_at is not null as reviewed`, [id, reviewedAt],
      ))).rows).toEqual([{ captain_reply: 'كمل', reviewed: true }]);
    });
  }
});

const invite = (inviter: string, code: string, owner = false) => {
  const sql = `insert into public.coach_invites (captain_id, code, access_until)
    values ($1, $2, test_clock.today() + 30)`;
  return owner ? db.query(sql, [inviter, code]) : asUser(db, inviter, (tx) => tx.query(sql, [inviter, code]));
};
const redeem = (redeemer: string, code: string) => asUser(db, redeemer,
  (tx) => tx.query('select public.redeem_invite($1)', [code]));

describe('SEC-04 only confirmed captains invite and admit players', () => {
  it('rejects confirmed players and unconfirmed captains at invite insertion', async () => {
    const unconfirmed = await createUser(db, 'captain');
    await db.query('update public.profiles set role_confirmed = false where id = $1', [unconfirmed]);
    for (const inviter of [stranger, unconfirmed]) {
      await expect(invite(inviter, `invalid-${inviter}`)).rejects.toMatchObject({ code: '42501' });
    }
  });
  it('rejects seeded invalid inviters at redemption without consuming the invite', async () => {
    const unconfirmed = await createUser(db, 'captain');
    await db.query('update public.profiles set role_confirmed = false where id = $1', [unconfirmed]);
    for (const inviter of [stranger, unconfirmed]) {
      const code = `seeded-${inviter}`;
      await invite(inviter, code, true);
      await expect(redeem(await createUser(db, 'player'), code)).rejects.toMatchObject({ code: '42501' });
      expect((await db.query(`select redeemed_by, redeemed_at from public.coach_invites where code = $1`, [code])).rows)
        .toEqual([{ redeemed_by: null, redeemed_at: null }]);
      expect((await db.query('select id from public.coach_clients where captain_id = $1', [inviter])).rows).toEqual([]);
    }
  });
  it('redeems a confirmed captain invite normally', async () => {
    const redeemer = await createUser(db, 'player');
    await invite(captain, 'valid-captain');
    await redeem(redeemer, 'valid-captain');
    expect((await db.query(`select captain_id from public.coach_clients where player_id = $1`, [redeemer])).rows)
      .toEqual([{ captain_id: captain }]);
    expect((await db.query(`select redeemed_by, redeemed_at is not null as used
      from public.coach_invites where code = 'valid-captain'`)).rows).toEqual([{ redeemed_by: redeemer, used: true }]);
  });
});

describe('SEC-05 lookups respect caller authorization', () => {
  it('hides known hierarchy IDs from strangers and keeps owner/player child SELECTs working', async () => {
    for (const caller of [stranger, captain, player]) {
      const allowed = caller !== stranger;
      expect((await asUser(db, caller, (tx) => tx.query(
        'select public.plan_of_meal($1) as meal_plan, public.plan_of_item($2) as item_plan', [meal, item],
      ))).rows).toEqual([{ meal_plan: allowed ? plan : null, item_plan: allowed ? plan : null }]);
      for (const [table, id] of [['meals', meal], ['meal_items', item], ['meal_item_alternatives', alternative]]) {
        expect((await asUser(db, caller, (tx) => tx.query(`select id from public.${table} where id = $1`, [id]))).rows)
          .toEqual(allowed ? [{ id }] : []);
      }
    }
  });
  it('returns tiers only to self or admin and preserves admin roster results', async () => {
    for (const caller of [stranger, player, captain, admin]) {
      expect((await asUser(db, caller, (tx) => tx.query('select public.current_tier($1) as tier', [captain]))).rows)
        .toEqual([{ tier: caller === captain || caller === admin ? 'champion' : null }]);
    }
    expect((await asUser(db, admin, (tx) => tx.query(
      'select tier, player_limit, last_paid_tier from public.admin_captains() where id = $1', [captain],
    ))).rows).toEqual([{ tier: 'champion', player_limit: 20, last_paid_tier: 'champion' }]);
  });
  it('denies private schema and function access to clients while retaining public grants', async () => {
    for (const role of ['anon', 'authenticated']) {
      expect((await db.query(`select has_schema_privilege($1, 'security_private', 'USAGE') as usage,
        has_function_privilege($1, 'security_private.current_tier(uuid)', 'EXECUTE') as execute`, [role])).rows)
        .toEqual([{ usage: false, execute: false }]);
    }
    await expect(asUser(db, stranger, (tx) => tx.query('select security_private.current_tier($1)', [captain])))
      .rejects.toMatchObject({ code: '42501' });
    for (const fn of ['current_tier', 'plan_of_meal', 'plan_of_item']) {
      expect((await db.query(`select has_function_privilege('authenticated', $1, 'EXECUTE') as authenticated,
        has_function_privilege('anon', $1, 'EXECUTE') as anon`, [`public.${fn}(uuid)`])).rows)
        .toEqual([{ authenticated: true, anon: false }]);
    }
  });
  it('uses the inviting captain real tier when admitting a sixth player', async () => {
    const coach = await createUser(db, 'captain');
    for (let i = 0; i < 5; i++) {
      await db.query(`insert into public.coach_clients (captain_id, player_id, access_until)
        values ($1, $2, test_clock.today() + 30)`, [coach, await createUser(db, 'player')]);
    }
    const sixth = await createUser(db, 'player');
    await invite(coach, 'sixth-player');
    await expect(redeem(sixth, 'sixth-player')).rejects.toMatchObject({ code: 'P0001' });
    await asUser(db, admin, (tx) => tx.query(`select public.admin_activate_plan($1, 'champion', 1, 'cash')`, [coach]));
    await redeem(sixth, 'sixth-player');
    expect((await db.query('select count(*)::int as players from public.coach_clients where captain_id = $1', [coach])).rows)
      .toEqual([{ players: 6 }]);
  });
});
