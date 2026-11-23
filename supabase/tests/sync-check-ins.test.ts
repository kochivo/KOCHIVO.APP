import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let player: string;
const week = '2026-10-31';
const legacyWeek = '2026-11-07';

const payload = (id: string, owner: string, weekStart = week) => [{
  id, week_start: weekStart, body_weight_kg: 75, waist_cm: 90, notes: 'تمام',
  photo_paths: [`${owner}/a.jpg`, `${owner}/b.jpg`], body_fat_pct: 18.5, photo_poses: ['front', 'side'],
}];

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
});
afterAll(async () => { await db?.close(); });

async function callSync(userId: string, rows: unknown): Promise<void> {
  await asUser(db, userId, (tx) => tx.query('select public.sync_check_ins($1)', [JSON.stringify(rows)]));
}

async function countFor(userId: string, weekStart = week): Promise<number> {
  const { rows } = await db.query<{ total: number }>(
    'select count(*)::int as total from public.check_ins where player_id = $1 and week_start = $2', [userId, weekStart]);
  return rows[0]?.total ?? 0;
}

describe('sync_check_ins', () => {
  it('inserts via the RPC and is idempotent', async () => {
    const id = '0194cc00-0000-7000-8000-000000000001';
    await callSync(player, payload(id, player));
    await callSync(player, payload(id, player));
    expect(await countFor(player)).toBe(1);
    const { rows } = await db.query(
      `select id, week_start::text as week_start, body_weight_kg::float as body_weight_kg,
        waist_cm::float as waist_cm, notes, photo_paths, body_fat_pct::float as body_fat_pct,
        photo_poses, captain_id from public.check_ins where player_id = $1`,
      [player],
    );
    expect(rows).toEqual([{
      id, week_start: week, body_weight_kg: 75, waist_cm: 90, notes: 'تمام',
      photo_paths: [`${player}/a.jpg`, `${player}/b.jpg`], body_fat_pct: 18.5,
      photo_poses: ['front', 'side'], captain_id: captain,
    }]);
  });

  it('keeps a legacy row for the same week standing', async () => {
    const second = await createCaptainWithPlayer(db);
    const legacyId = '0194cc00-0000-7000-8000-000000000002';
    await db.query(
      `insert into public.check_ins (id, player_id, week_start, body_weight_kg) values ($1, $2, $3, 80)`,
      [legacyId, second.player, legacyWeek],
    );
    await callSync(second.player, payload('0194cc00-0000-7000-8000-000000000003', second.player, legacyWeek));
    expect(await countFor(second.player, legacyWeek)).toBe(1);
    const { rows } = await db.query<{ id: string; body_weight_kg: string }>(
      'select id, body_weight_kg::text as body_weight_kg from public.check_ins where player_id = $1 and week_start = $2',
      [second.player, legacyWeek],
    );
    expect(rows).toEqual([{ id: legacyId, body_weight_kg: '80.0' }]);
  });

  it('gives another player their own row for the same week', async () => {
    const second = await createCaptainWithPlayer(db);
    await callSync(second.player, payload('0194cc00-0000-7000-8000-000000000004', second.player));
    expect(await countFor(second.player)).toBe(1);
    expect(await countFor(player)).toBe(1);
    const { rows } = await db.query<{ total: number }>(
      'select count(*)::int as total from public.check_ins where week_start = $1', [week]);
    expect(rows[0]?.total).toBe(2);
  });

  it('denies anonymous callers', async () => {
    await expect(db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      await tx.query('select public.sync_check_ins($1)', [JSON.stringify(payload('0194cc00-0000-7000-8000-000000000005', player))]);
    })).rejects.toMatchObject({ code: '42501' });
    expect(await countFor(player)).toBe(1);
  });

  it('denies a lapsed-subscription player with 42501', async () => {
    const lapsed = await createCaptainWithPlayer(db);
    await db.query(`update public.coach_clients set access_until = '2026-10-01' where player_id = $1`, [lapsed.player]);
    await expect(callSync(lapsed.player, payload('0194cc00-0000-7000-8000-000000000006', lapsed.player)))
      .rejects.toMatchObject({ code: '42501' });
    expect(await countFor(lapsed.player)).toBe(0);
  });
});
