import fs from 'node:fs/promises';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let other: string;
beforeAll(async () => {
  db = await createTestDb();
  const snippet = await fs.readFile(new URL('../../docs/sql/body-scans-captain-read.sql', import.meta.url), 'utf8');
  await db.exec(snippet);
  await db.exec(snippet);
  ({ captain, player } = await createCaptainWithPlayer(db, '2026-09-01'));
  other = await createUser(db, 'captain');
  await asUser(db, player, tx => tx.query(`insert into public.body_scans (id,scan_date,weight_kg)
    values ('01900000-0000-7000-8000-000000000001','2026-08-15',82),
      ('01900000-0000-7000-8000-000000000002','2026-10-01',80)`));
});
afterAll(async () => { await db?.close(); });

it('keeps the idempotent SELECT snippet scoped to the current captain and relationship start', async () => {
  const read = (user: string) => asUser(db, user, tx => tx.query('select scan_date::text from public.body_scans order by scan_date'));
  expect((await read(captain)).rows).toEqual([{ scan_date: '2026-10-01' }]);
  expect((await read(other)).rows).toEqual([]);
  expect((await read(player)).rows).toHaveLength(2);
  await db.query('update public.coach_clients set archived_at=now() where player_id=$1', [player]);
  expect((await read(captain)).rows).toEqual([]);
  await db.query('update public.coach_clients set archived_at=null where player_id=$1', [player]);
  expect((await read(captain)).rows).toEqual([{ scan_date: '2026-10-01' }]);
});

it('does not grant a captain write access to their player scans', async () => {
  await expect(asUser(db, captain, tx => tx.query(`insert into public.body_scans (id,player_id,scan_date,weight_kg)
    values ('01900000-0000-7000-8000-000000000003',$1,'2026-10-02',79)`, [player]))).rejects.toThrow();
});
