import type { PGlite, Transaction } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let otherCaptain: string;
let otherPlayer: string;

const insert = (tx: Transaction, owner: string) => tx.query(
  `insert into public.player_intake
    (player_id, birth_year, sex, height_cm, weight_kg, training_days, session_minutes, experience)
   values ($1, 1995, 'male', 175.5, 80, array[0,2,4], 60, 'new') returning player_id`, [owner],
);

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: otherCaptain, player: otherPlayer } = await createCaptainWithPlayer(db));
  await asUser(db, player, (tx) => insert(tx, player));
});

afterAll(async () => { await db.close(); });

describe('intake RLS', () => {
  it('lets a player insert, read, and update their own intake', async () => {
    expect((await asUser(db, otherPlayer, (tx) => insert(tx, otherPlayer))).rows).toEqual([{ player_id: otherPlayer }]);
    const result = await asUser(db, player, (tx) => tx.query(
      `update public.player_intake set weight_kg = 79, updated_at = '2000-01-01T00:00:00Z'
       where player_id = $1 returning weight_kg::text, injuries, allergies, medical, completed_at,
         updated_at > '2000-01-01T00:00:00Z' as touched`, [player],
    ));
    expect(result.rows).toEqual([{
      weight_kg: '79.0', injuries: [], allergies: [], medical: [], completed_at: null, touched: true,
    }]);
    expect((await asUser(db, player, (tx) => tx.query(`select player_id from public.player_intake`))).rows)
      .toEqual([{ player_id: player }]);
  });

  it('prevents reading, inserting, and updating another player’s row', async () => {
    const unlinked = await createUser(db, 'player');
    await expect(asUser(db, player, (tx) => insert(tx, unlinked))).rejects.toMatchObject({ code: '42501' });
    expect((await asUser(db, player, (tx) => tx.query(
      `select * from public.player_intake where player_id = $1`, [otherPlayer],
    ))).rows).toEqual([]);
    expect((await asUser(db, player, (tx) => tx.query(
      `update public.player_intake set notes = 'changed' where player_id = $1 returning player_id`, [otherPlayer],
    ))).rows).toEqual([]);
    await expect(asUser(db, player, (tx) => tx.query(
      `update public.player_intake set player_id = $1 where player_id = $2`, [unlinked, player],
    ))).rejects.toMatchObject({ code: '42501' });
  });

  it('allows only the owning captain to read, with no captain writes', async () => {
    expect((await asUser(db, captain, (tx) => tx.query(`select player_id from public.player_intake`))).rows)
      .toEqual([{ player_id: player }]);
    expect((await asUser(db, captain, (tx) => tx.query(
      `update public.player_intake set notes = 'changed' where player_id = $1 returning player_id`, [player],
    ))).rows).toEqual([]);
    expect((await asUser(db, otherCaptain, (tx) => tx.query(
      `select * from public.player_intake where player_id = $1`, [player],
    ))).rows).toEqual([]);
    const unlinked = await createUser(db, 'player');
    await expect(asUser(db, captain, (tx) => insert(tx, unlinked))).rejects.toMatchObject({ code: '42501' });
  });

  it('revokes captain access when their link is archived', async () => {
    await db.query(`update public.coach_clients set archived_at = '2026-06-01T12:00:00Z' where player_id = $1`, [player]);
    try {
      expect((await asUser(db, captain, (tx) => tx.query(
        `select * from public.player_intake where player_id = $1`, [player],
      ))).rows).toEqual([]);
      expect((await asUser(db, player, (tx) => tx.query(
        `select * from public.player_intake where player_id = $1`, [player],
      ))).rows).toHaveLength(1);
    } finally {
      await db.query(`update public.coach_clients set archived_at = null where player_id = $1`, [player]);
    }
  });

  it('grants neither anonymous access nor authenticated delete', async () => {
    const { rows } = await db.query(
      `select has_table_privilege('anon', 'public.player_intake', 'SELECT') as anon_select,
        has_table_privilege('anon', 'public.player_intake', 'INSERT') as anon_insert,
        has_table_privilege('anon', 'public.player_intake', 'UPDATE') as anon_update,
        has_table_privilege('anon', 'public.player_intake', 'DELETE') as anon_delete`,
    );
    expect(rows).toEqual([{ anon_select: false, anon_insert: false, anon_update: false, anon_delete: false }]);
    await expect(asUser(db, player, (tx) => tx.query(`delete from public.player_intake where player_id = $1`, [player])))
      .rejects.toMatchObject({ code: '42501' });
    expect((await db.query(`select tablename from pg_catalog.pg_tables where schemaname = 'public' and not rowsecurity`)).rows)
      .toEqual([]);
  });
});

describe('intake constraints', () => {
  for (const days of ['array[0,0]', 'array[7]', 'array[-1]', 'array[]::smallint[]', 'array[0,null]', 'array[[0,1],[2,3]]']) {
    it(`rejects training_days = ${days}`, async () => {
      await expect(asUser(db, player, (tx) => tx.query(
        `update public.player_intake set training_days = ${days} where player_id = $1`, [player],
      ))).rejects.toMatchObject({ code: '23514' });
    });
  }

  it('accepts every weekday once', async () => {
    expect((await asUser(db, player, (tx) => tx.query(
      `update public.player_intake set training_days = array[0,1,2,3,4,5,6] where player_id = $1 returning training_days`, [player],
    ))).rows).toEqual([{ training_days: [0, 1, 2, 3, 4, 5, 6] }]);
  });

  for (const assignment of [
    'birth_year = 1929', 'birth_year = extract(year from test_clock.today())::int - 9', "sex = 'other'",
    'height_cm = 99.9', 'height_cm = 250.1', 'weight_kg = 24.9', 'weight_kg = 300.1',
    'target_weight_kg = 24.9', 'target_weight_kg = 300.1', 'session_minutes = 15', "experience = 'expert'",
    "notes = repeat('أ', 501)",
  ]) {
    it(`rejects ${assignment}`, async () => {
      await expect(asUser(db, player, (tx) => tx.query(
        `update public.player_intake set ${assignment} where player_id = $1`, [player],
      ))).rejects.toMatchObject({ code: '23514' });
    });
  }

  it('enforces one row per player and cascades profile deletion', async () => {
    await expect(asUser(db, player, (tx) => insert(tx, player))).rejects.toMatchObject({ code: '23505' });
    const disposable = await createUser(db, 'player');
    await asUser(db, disposable, (tx) => insert(tx, disposable));
    await db.query(`delete from public.profiles where id = $1`, [disposable]);
    expect((await db.query(`select * from public.player_intake where player_id = $1`, [disposable])).rows).toEqual([]);
  });
});
