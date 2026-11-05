import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
const today = '2026-11-03';

async function fixture({ name = 'Player', start = '2026-10-01', status = 'active', sessions = [] as string[], archived = false } = {}) {
  const captain = await createUser(db, 'captain');
  const player = await createUser(db, 'player', name);
  await db.query(`update public.profiles set phone = '+201001234567' where id = $1`, [player]);
  await db.query(`insert into public.coach_clients (captain_id, player_id, started_on, access_until, archived_at)
    values ($1, $2, $3, '2026-12-01', $4)`, [captain, player, start, archived ? '2026-11-01' : null]);
  if (status !== 'none') await db.query(`insert into public.programs (captain_id, player_id, title, status)
    values ($1, $2, 'Program', $3)`, [captain, player, status]);
  for (const date of sessions) await db.query(`insert into public.workout_sessions
    (id, player_id, training_date, started_at, client_updated_at)
    values (gen_random_uuid(), $1, $2::date, $2::date, $2::date)`, [player, date]);
  return { captain, player };
}

function radar(captain: string) {
  return asUser(db, captain, (tx) => tx.query('select * from public.captain_dropout_radar($1)', [today]));
}

describe('captain_dropout_radar', () => {
  it.each([
    { status: 'active', sessions: ['2026-10-20', '2026-10-31'], start: '2026-10-31', reason: 'no_activity', days: 3 },
    { status: 'active', sessions: [], start: '2026-10-31', reason: 'never_started', days: 3 },
    { status: 'none', sessions: [], start: '2026-11-01', reason: 'no_program', days: 2 },
    { status: 'draft', sessions: [], start: '2026-10-31', reason: 'no_program', days: 3 },
    { status: 'archived', sessions: ['2026-10-30'], start: '2026-10-01', reason: 'no_program', days: 4 },
  ])('chooses $reason with $status program and counts $days days', async (input) => {
    const { captain, player } = await fixture(input);
    expect((await radar(captain)).rows).toEqual([{
      player_id: player, full_name: 'Player', phone: '+201001234567', reason: input.reason, days: input.days,
    }]);
  });
  it.each([
    { sessions: ['2026-11-02'] },
    { start: '2026-11-01', sessions: [] },
    { start: '2026-11-02', sessions: ['2026-10-25'] },
    { start: '2026-11-02', status: 'none' },
    { archived: true },
  ])('excludes recent activity, recent starts and archived players: %j', async (input) => {
    expect((await radar((await fixture(input)).captain)).rows).toEqual([]);
  });
  it('uses one reason per player and sorts by days descending then name', async () => {
    const { captain, player } = await fixture({ name: 'Ziad', sessions: ['2026-10-30'] });
    for (const [name, start] of [['Amr', '2026-10-30'], ['Oldest', '2026-10-20']]) {
      const other = await createUser(db, 'player', name);
      await db.query(`insert into public.coach_clients (captain_id, player_id, started_on, access_until)
        values ($1, $2, $3, '2026-12-01')`, [captain, other, start]);
    }
    await db.query(`insert into public.programs (captain_id, player_id, title, status)
      values ($1, $2, 'Old', 'archived')`, [captain, player]);
    expect((await radar(captain)).rows).toEqual([
      expect.objectContaining({ full_name: 'Oldest', reason: 'no_program', days: 14 }),
      expect.objectContaining({ full_name: 'Amr', reason: 'no_program', days: 4 }),
      expect.objectContaining({ full_name: 'Ziad', reason: 'no_activity', days: 4 }),
    ]);
  });
  it('isolates captains and returns no rows to a player', async () => {
    const { captain, player } = await fixture();
    expect((await radar(captain)).rows).toHaveLength(1);
    expect((await radar(await createUser(db, 'captain'))).rows).toEqual([]);
    expect((await radar(player)).rows).toEqual([]);
  });
  it('denies anonymous execute', async () => {
    expect((await db.query(`select has_function_privilege('anon', 'public.captain_dropout_radar(date)', 'EXECUTE') as allowed`)).rows)
      .toEqual([{ allowed: false }]);
    await expect(db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      await tx.query('select * from public.captain_dropout_radar($1)', [today]);
    })).rejects.toThrow(/permission denied for function captain_dropout_radar/);
  });
});
