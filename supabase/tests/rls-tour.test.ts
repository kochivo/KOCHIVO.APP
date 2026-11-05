import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

it.each(['captain', 'player'] as const)('persists the tour only for its %s owner', async role => {
  const owner = await createUser(db, role);
  const other = await createUser(db, 'player');
  expect((await db.query('select tour_seen_at from profiles where id = $1', [owner])).rows)
    .toEqual([{ tour_seen_at: null }]);
  await asUser(db, owner, tx => tx.query('update profiles set tour_seen_at = $1 where id = $2', [TEST_NOW, owner]));
  expect((await db.query('select tour_seen_at::text as seen from profiles where id = $1', [owner])).rows)
    .toEqual([{ seen: '2026-11-03 10:00:00+00' }]);
  expect((await asUser(db, owner, tx => tx.query('update profiles set tour_seen_at = $1 where id = $2 returning id', [TEST_NOW, other]))).rows).toEqual([]);
});

it('keeps suspended callers and anonymous visitors out', async () => {
  const owner = await createUser(db, 'player');
  await db.query('update profiles set suspended_at = $1 where id = $2', [TEST_NOW, owner]);
  await expect(asUser(db, owner, tx => tx.query('update profiles set tour_seen_at = $1 where id = $2', [TEST_NOW, owner])))
    .rejects.toThrow(/suspended/);
  await expect(db.transaction(async tx => {
    await tx.exec('set local role anon');
    await tx.query('update profiles set tour_seen_at = $1 where id = $2', [TEST_NOW, owner]);
  })).rejects.toThrow(/permission denied/);
});
