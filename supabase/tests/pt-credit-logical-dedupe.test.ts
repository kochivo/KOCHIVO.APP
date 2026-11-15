import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

async function fixture() {
  const { captain, player } = await createCaptainWithPlayer(db);
  await db.query(`update coach_clients set sessions_left=3,
    billing_started_at='2026-11-03T07:00:00Z' where player_id=$1`, [player]);
  const program = (await db.query<{ id: string }>(`insert into programs(captain_id,player_id,title,status)
    values($1,$2,'Training','active') returning id`, [captain, player])).rows[0];
  if (!program) throw new Error('Missing program');
  const days = (await db.query<{ id: string }>(`insert into program_days(program_id,position,title,weekday)
    values($1,0,'First',3),($1,1,'Second',4) returning id`, [program.id])).rows;
  const first = days[0]?.id, second = days[1]?.id;
  if (!first || !second) throw new Error('Missing program days');
  return { player, first, second };
}

async function sync(player: string, day: string | null, id: string, hour = '09') {
  await asUser(db, player, tx => tx.query('select sync_workout_sessions($1)', [JSON.stringify([{
    id, program_day_id: day, training_date: '2026-11-03', started_at: '2026-11-03T08:00:00Z',
    completed_at: '2026-11-03T09:00:00Z', client_updated_at: `2026-11-03T${hour}:00:00Z`,
  }])]));
}

async function expectCredits(player: string, deductions: number) {
  expect((await db.query('select sessions_left from coach_clients where player_id=$1', [player])).rows)
    .toEqual([{ sessions_left: 3 - deductions }]);
  expect((await db.query(`select d.session_id from session_deductions d
    join workout_sessions s on s.id=d.session_id where s.player_id=$1`, [player])).rows).toHaveLength(deductions);
}

const id1 = '01900000-0000-7000-8000-000000000296';
const id2 = '01900000-0000-7000-8000-000000000297';
const id3 = '01900000-0000-7000-8000-000000000298';
const id4 = '01900000-0000-7000-8000-000000000299';

it('charges only once for two ids with the same player, day and date', async () => {
  const { player, first } = await fixture();
  await sync(player, first, id1);
  await sync(player, first, id2);
  await expectCredits(player, 1);
  expect((await db.query('select id from workout_sessions where player_id=$1', [player])).rows).toHaveLength(2);
});

it('charges for two different days on the same date', async () => {
  const { player, first, second } = await fixture();
  await sync(player, first, id3);
  await sync(player, second, id4);
  await expectCredits(player, 2);
});

it('keeps one deduction when retrying the same id', async () => {
  const { player, first } = await fixture();
  const id = '01900000-0000-7000-8000-000000000300';
  await sync(player, first, id);
  await sync(player, first, id, '10');
  await expectCredits(player, 1);
});
