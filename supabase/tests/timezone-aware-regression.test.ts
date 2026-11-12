import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, TEST_NOW } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

async function injectClock(instant: string) {
  await db.exec(`create or replace function pg_catalog.now() returns timestamptz language sql stable
    as $$ select timestamptz '${instant}' $$`);
}

it('reads a replaced clock after repeated calls without discarding any plans', async () => {
  const { captain } = await createCaptainWithPlayer(db);
  const query = 'select public.user_today($1)::text as today';
  for (let i = 0; i < 8; i++) {
    expect((await db.query(query, [captain])).rows).toEqual([{ today: '2026-11-03' }]);
  }
  try {
    for (const [instant, today] of [
      ['2026-11-30T22:30:00Z', '2026-12-01'],
      ['2026-12-31T22:30:00Z', '2027-01-01'],
      [TEST_NOW, '2026-11-03'],
    ]) {
      await injectClock(instant ?? TEST_NOW);
      expect((await db.query(query, [captain])).rows).toEqual([{ today }]);
    }
  } finally { await injectClock(TEST_NOW); }
});

it('uses a non-Cairo player day for inactivity and the captain day for access', async () => {
  const { captain, player } = await createCaptainWithPlayer(db, '2026-10-01');
  await injectClock('2026-11-03T12:30:00Z');
  try {
    await db.query(`update profiles set timezone=case when id=$1 then 'Europe/London' else 'Pacific/Auckland' end
      where id in($1,$2)`, [captain, player]);
    await db.query(`update coach_clients set access_until='2026-11-03' where player_id=$1`, [player]);
    await db.query(`insert into workout_sessions(id,player_id,training_date,started_at,client_updated_at)
      values(gen_random_uuid(),$1,'2026-11-01','2026-11-01T10:00Z',now())`, [player]);
    for (let i = 0; i < 2; i++) await asUser(db, captain, tx => tx.query('select public.refresh_inactive_alerts()'));
    expect((await db.query(`select payload->>'player_id' as player from notifications
      where user_id=$1 and type='player_inactive'`, [captain])).rows).toEqual([{ player }]);
  } finally { await injectClock(TEST_NOW); }
});

it('keeps the expiry date argument as a Cairo anchor while dispatching the captain day', async () => {
  const { captain, player } = await createCaptainWithPlayer(db);
  await injectClock('2026-11-03T12:30:00Z');
  try {
    await db.query(`update profiles set timezone=case when id=$1 then 'Pacific/Auckland' else 'Europe/London' end
      where id in($1,$2)`, [captain, player]);
    await db.query(`update coach_clients set access_until='2026-11-07' where player_id=$1`, [player]);
    for (let i = 0; i < 2; i++) await db.query(`select public.queue_expiry_reminders('2026-11-03')`);
    expect((await db.query(`select payload->>'days_left' as days from notifications
      where user_id=$1 and type='subscription_expiring'`, [player])).rows).toEqual([{ days: '3' }]);
  } finally { await injectClock(TEST_NOW); }
});
