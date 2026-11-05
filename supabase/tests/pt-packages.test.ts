import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite, captain: string, player: string, other: string, link: string;
const session = '01900000-0000-7000-8000-000000000083';
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  const result = await db.query<{ id: string }>('select id from coach_clients where player_id=$1', [player]);
  link = result.rows[0]?.id ?? '';
});
afterAll(async () => { await db?.close(); });
const activate = async (user: string, kind = 'sessions', quantity = 2) => {
  await db.query('update coach_clients set pending=true where id=$1', [link]);
  return asUser(db, user, tx => tx.query('select activate_player($1,null,$2,$3,100,50,false)', [link, kind, quantity]));
};
const balance = async () => (await db.query<{ sessions_left: number | null; pending: boolean; frozen_at: string | null }>(
  'select sessions_left,pending,frozen_at from coach_clients where id=$1', [link])).rows[0];

it('requires the owning active captain and validates quantities and money', async () => {
  await expect(activate(player)).rejects.toMatchObject({ code: '42501' });
  await expect(activate(other)).rejects.toMatchObject({ code: '42501' });
  await expect(activate(captain, 'sessions', 201)).rejects.toMatchObject({ code: '22023' });
  await activate(captain);
  expect(await balance()).toEqual({ sessions_left: 2, pending: false, frozen_at: null });
  await expect(asUser(db, captain, tx => tx.query('update coach_clients set sessions_left=99 where id=$1', [link])))
    .rejects.toThrow();
  expect((await asUser(db, player, tx => tx.query('select sessions_left from coach_clients where id=$1', [link]))).rows)
    .toEqual([{ sessions_left: 2 }]);
});
it('hides training for pending and frozen players, preserving time based access', async () => {
  await db.query("insert into programs(captain_id,player_id,title,status) values ($1,$2,'Training','active')", [captain, player]);
  for (const flag of ['pending=true', 'pending=false,frozen_at=now()']) {
    await db.query(`update coach_clients set ${flag} where id=$1`, [link]);
    expect((await asUser(db, player, tx => tx.query('select id from programs'))).rows).toEqual([]);
    expect((await asUser(db, player, tx => tx.query('select player_can_read() as r,player_can_write() as w'))).rows)
      .toEqual([{ r: false, w: false }]);
  }
  await db.query('update coach_clients set frozen_at=null where id=$1', [link]);
  expect((await asUser(db, player, tx => tx.query('select id from programs'))).rows).toHaveLength(1);
});
it('unfreezes once and saves whole elapsed days', async () => {
  await expect(asUser(db, other, tx => tx.query('select set_player_frozen($1,true)', [link]))).rejects.toMatchObject({ code: '42501' });
  await expect(asUser(db, player, tx => tx.query('select set_player_frozen($1,true)', [link]))).rejects.toMatchObject({ code: '42501' });
  await asUser(db, captain, tx => tx.query('select set_player_frozen($1,true)', [link]));
  await db.query("update coach_clients set frozen_at=now()-interval '5 days 3 hours',access_until='2026-12-01' where id=$1", [link]);
  await asUser(db, captain, tx => tx.query('select set_player_frozen($1,false)', [link]));
  await asUser(db, captain, tx => tx.query('select set_player_frozen($1,false)', [link]));
  expect((await db.query('select access_until::text as d from coach_clients where id=$1', [link])).rows).toEqual([{ d: '2026-12-06' }]);
});
it('activates time-based trials without dues and rejects repeat activation', async () => {
  await db.query('update coach_clients set pending=true where id=$1', [link]);
  await asUser(db, captain, tx => tx.query("select activate_player($1,null,'days',7,0,0,true)", [link]));
  expect((await balance())?.sessions_left).toBeNull();
  expect((await db.query("select price_egp,amount_egp,notes from player_payments where notes='free_trial' and player_id=$1", [player])).rows)
    .toEqual([{ price_egp: 0, amount_egp: 0, notes: 'free_trial' }]);
  await expect(asUser(db, captain, tx => tx.query("select activate_player($1,null,'days',7,0,0,true)", [link]))).rejects.toMatchObject({ code: '22023' });
});
it('deducts completed sessions once across LWW retries and notifies at zero', async () => {
  await activate(captain, 'sessions', 1);
  const row = { id: session, training_date: '2026-11-03', started_at: '2026-11-03T08:00:00Z',
    completed_at: '2026-11-03T09:00:00Z', client_updated_at: '2026-11-03T09:00:00Z' };
  for (const time of ['09', '10', '11']) await asUser(db, player, tx => tx.query('select sync_workout_sessions($1)',
    [JSON.stringify([{ ...row, client_updated_at: `2026-11-03T${time}:00:00Z` }])]));
  await db.query('update coach_clients set sessions_left=1 where id=$1', [link]);
  await asUser(db, player, tx => tx.query('select sync_workout_sessions($1)', [JSON.stringify([
    { ...row, completed_at: null, client_updated_at: '2026-11-03T12:00:00Z' },
  ])]));
  await asUser(db, player, tx => tx.query('select sync_workout_sessions($1)', [JSON.stringify([
    { ...row, client_updated_at: '2026-11-03T13:00:00Z' },
  ])]));
  expect((await balance())?.sessions_left).toBe(1);
  await db.query('update coach_clients set sessions_left=0 where id=$1', [link]);
  expect((await balance())?.sessions_left).toBe(0);
  expect((await db.query("select id from notifications where type='sessions_used_up' and user_id=$1", [captain])).rows).toHaveLength(1);
  await expect(asUser(db, player, tx => tx.query('insert into session_deductions(session_id) values ($1)', [session]))).rejects.toThrow();
});
it('tops up sessions and keeps the greater validity date', async () => {
  const pkg = await db.query<{ id: string }>(`insert into captain_packages(captain_id,name,price_egp,days,kind,sessions)
    values ($1,'PT',100,60,'sessions',12) returning id`, [captain]);
  await asUser(db, captain, tx => tx.query('select renew_player($1,p_package => $2)', [player, pkg.rows[0]?.id]));
  expect((await balance())?.sessions_left).toBe(12);
  expect((await db.query('select access_until::text as d from coach_clients where id=$1', [link])).rows).toEqual([{ d: '2027-01-02' }]);
});
