import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let owner: { captain: string; player: string };
let intruder: { captain: string; player: string };
const EXERCISE = '01900000-0000-8000-8000-000000000201';
const PROGRAM = '01900000-0000-8000-8000-000000000202';
const DAY = '01900000-0000-8000-8000-000000000203';
const ITEM = '01900000-0000-8000-8000-000000000204';
const SESSION = '01900000-0000-8000-8000-000000000205';
const NOW = '2026-11-03T08:00:00Z';

beforeAll(async () => {
  db = await createTestDb();
  owner = await createCaptainWithPlayer(db);
  intruder = await createCaptainWithPlayer(db);
  await db.query(`insert into public.exercises (id, name_en, body_part) values ($1, 'squat', 'legs')`, [EXERCISE]);
  await db.query(
    `insert into public.programs (id, captain_id, player_id, title, status) values ($1, $2, $3, 'Plan', 'active')`,
    [PROGRAM, owner.captain, owner.player],
  );
  await db.query(`insert into public.program_days (id, program_id, position) values ($1, $2, 1)`, [DAY, PROGRAM]);
  await db.query(
    `insert into public.program_exercises (id, day_id, exercise_id, position, sets, reps_min) values ($1, $2, $3, 1, 3, 8)`,
    [ITEM, DAY, EXERCISE],
  );
  await asUser(db, owner.player, (tx) => tx.query(
    `insert into public.workout_sessions (id, program_day_id, training_date, started_at, client_updated_at) values ($1, $2, $3::date, $3, $3)`,
    [SESSION, DAY, NOW],
  ));
});

afterAll(async () => {
  await db.close();
});

describe('log ownership (0011)', () => {
  it('A player cannot start a session on another player’s program day.', async () => {
    await expect(asUser(db, intruder.player, (tx) => tx.query(
      `insert into public.workout_sessions (id, program_day_id, training_date, started_at, client_updated_at) values ($1, $2, $3::date, $3, $3)`,
      ['01900000-0000-8000-8000-000000000206', DAY, NOW],
    ))).rejects.toThrow(/row-level security/);
  });

  it('A player cannot attach a set to another player’s session.', async () => {
    await expect(asUser(db, intruder.player, (tx) => tx.query(
      `insert into public.set_logs (id, session_id, exercise_id, set_index, reps, completed_at, client_updated_at) values ($1, $2, $3, 1, 8, $4, $4)`,
      ['01900000-0000-8000-8000-000000000207', SESSION, EXERCISE, NOW],
    ))).rejects.toThrow(/row-level security/);
  });

  it('A player can still log a set on their own session and program exercise.', async () => {
    await asUser(db, owner.player, (tx) => tx.query(
      `insert into public.set_logs (id, session_id, program_exercise_id, exercise_id, set_index, reps, completed_at, client_updated_at)
       values ($1, $2, $3, $4, 1, 8, $5, $5)`,
      ['01900000-0000-8000-8000-000000000208', SESSION, ITEM, EXERCISE, NOW],
    ));
    const { rows } = await asUser(db, owner.player, (tx) => tx.query(`select count(*)::int as n from public.set_logs`));
    expect(rows).toEqual([{ n: 1 }]);
  });
});
