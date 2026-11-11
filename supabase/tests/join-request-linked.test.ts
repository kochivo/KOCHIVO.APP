import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

it('rolls back a request to captain B when the player already has an active link to captain A', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  const other = await createUser(db, 'captain');
  await db.query('update profiles set public_slug=$2 where id=$1', [other, 'captain-b']);
  await expect(asUser(db, player, tx => tx.query(
    'insert into coach_join_requests(id,captain_id,player_id) values (gen_random_uuid(),$1,$2)', [other, player],
  ))).rejects.toMatchObject({ code: '23505', constraint: 'coach_clients_one_active_captain' });
  expect((await asUser(db, player, tx => tx.query(
    'select id from coach_join_requests where player_id=$1', [player],
  ))).rows).toEqual([]);
  expect((await asUser(db, player, tx => tx.query(
    'select captain_id,pending from coach_clients where player_id=$1 and archived_at is null', [player],
  ))).rows).toEqual([{ captain_id: captain, pending: false }]);
});
