import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { asUser, createTestDb, createUser, dayOffset } from './harness';

let db: PGlite;
let captainA: string;
let captainB: string;
let player: string;
let exerciseId: string;
let templateId: string;

async function link(captain: string, p: string, accessUntilOffset: number) {
  await db.query(`update public.coach_clients set archived_at = now() where player_id = $1 and archived_at is null`, [p]);
  await db.query(`insert into public.coach_clients (captain_id, player_id, access_until) values ($1, $2, $3)`, [
    captain,
    p,
    await dayOffset(db, accessUntilOffset),
  ]);
}

beforeAll(async () => {
  db = await createTestDb();
  captainA = await createUser(db, 'captain', 'A');
  captainB = await createUser(db, 'captain', 'B');
  player = await createUser(db, 'player');
  await link(captainA, player, 30);

  exerciseId = (await db.query<{ id: string }>(
    `insert into public.exercises (name_en, name_ar, body_part) values ('bench press', 'بنش', 'chest') returning id`,
  )).rows[0]!.id;

  // Captain A builds a template (one day, one exercise) and assigns it.
  templateId = await asUser(db, captainA, async (tx) => {
    const t = (await tx.query<{ id: string }>(
      `insert into public.programs (captain_id, is_template, title) values ($1, true, 'تضخيم') returning id`, [captainA],
    )).rows[0]!.id;
    const d = (await tx.query<{ id: string }>(
      `insert into public.program_days (program_id, position, title) values ($1, 0, 'صدر') returning id`, [t],
    )).rows[0]!.id;
    await tx.query(
      `insert into public.program_exercises (day_id, exercise_id, position, sets, reps_min) values ($1, $2, 0, 4, 8)`, [d, exerciseId],
    );
    await tx.query(`select public.assign_program_template($1, $2)`, [t, player]);
    return t;
  });
});

describe('migrations', () => {
  it('apply cleanly and create profiles from sign-up metadata', async () => {
    const { rows } = await db.query<{ role: string }>(`select role from public.profiles where id = $1`, [captainA]);
    expect(rows[0]?.role).toBe('captain');
  });
});

describe('captain isolation', () => {
  it('captain B sees none of captain A players, programs or templates', async () => {
    await asUser(db, captainB, async (tx) => {
      expect((await tx.query(`select * from public.coach_clients`)).rows).toHaveLength(0);
      expect((await tx.query(`select * from public.programs`)).rows).toHaveLength(0);
      expect((await tx.query(`select * from public.profiles where id = $1`, [player])).rows).toHaveLength(0);
    });
  });

  it('captain B cannot assign a program to captain A player', async () => {
    await expect(
      asUser(db, captainB, (tx) =>
        tx.query(`insert into public.programs (captain_id, player_id, title, status) values ($1, $2, 'x', 'active')`, [captainB, player]),
      ),
    ).rejects.toThrow();
  });
});

describe('player access', () => {
  it('reads the assigned copy but never the template', async () => {
    await asUser(db, player, async (tx) => {
      const { rows } = await tx.query<{ is_template: boolean }>(`select is_template from public.programs`);
      expect(rows).toEqual([{ is_template: false }]);
      expect((await tx.query(`select * from public.programs where id = $1`, [templateId])).rows).toHaveLength(0);
      expect((await tx.query(`select * from public.program_exercises`)).rows).toHaveLength(1);
    });
  });

  it('cannot change own role', async () => {
    await expect(
      asUser(db, player, (tx) => tx.query(`update public.profiles set role = 'captain' where id = $1`, [player])),
    ).rejects.toThrow(/role and plan/);
  });
});

describe('subscription grace period (PRD §7)', () => {
  const logSet = (tx: Parameters<Parameters<typeof asUser>[2]>[0], dayId: string, pe: string, updatedAt: string, weight: number) =>
    tx.query(`select public.sync_workout_sessions($1)`, [
      JSON.stringify([{ id: SESSION, program_day_id: dayId, training_date: '2026-11-03', started_at: updatedAt, completed_at: null, client_updated_at: updatedAt }]),
    ]).then(() =>
      tx.query(`select public.sync_set_logs($1)`, [
        JSON.stringify([{ id: SET, session_id: SESSION, program_exercise_id: pe, exercise_id: exerciseId, set_index: 0,
          weight_kg: weight, reps: 8, completed_at: updatedAt, client_updated_at: updatedAt, deleted_at: null }]),
      ]),
    );
  const SESSION = '01900000-0000-8000-8000-000000000001';
  const SET = '01900000-0000-8000-8000-000000000002';

  async function assignedIds() {
    return asUser(db, player, async (tx) => {
      const { rows } = await tx.query<{ day: string; pe: string }>(
        `select d.id as day, pe.id as pe from public.program_days d join public.program_exercises pe on pe.day_id = d.id limit 1`,
      );
      return rows[0];
    });
  }

  it('active: logs sync, and an older edit never overwrites a newer one', async () => {
    const ids = (await assignedIds())!;
    await asUser(db, player, (tx) => logSet(tx, ids.day, ids.pe, '2026-11-03T08:10:00Z', 62.5));
    await asUser(db, player, (tx) => logSet(tx, ids.day, ids.pe, '2026-11-03T08:05:00Z', 60));
    const { rows } = await db.query<{ weight_kg: string }>(`select weight_kg from public.set_logs where id = $1`, [SET]);
    expect(Number(rows[0]?.weight_kg)).toBe(62.5);
  });

  it('expired 2 days ago: still reads the program, cannot log', async () => {
    const ids = (await assignedIds())!;
    await db.query(`update public.coach_clients set access_until = current_date - 2 where player_id = $1`, [player]);
    expect(await assignedIds()).toBeDefined();
    await expect(asUser(db, player, (tx) => logSet(tx, ids.day, ids.pe, '2026-11-03T09:00:00Z', 70))).rejects.toThrow(
      /row-level security/,
    );
  });

  it('expired 5 days ago: program hidden, own history kept', async () => {
    await db.query(`update public.coach_clients set access_until = current_date - 5 where player_id = $1`, [player]);
    expect(await assignedIds()).toBeUndefined();
    const history = await asUser(db, player, (tx) => tx.query(`select * from public.set_logs`));
    expect(history.rows).toHaveLength(1);
    await db.query(`update public.coach_clients set access_until = current_date + 30 where player_id = $1`, [player]);
  });
});

describe('free plan limit', () => {
  it('blocks the 6th active player', async () => {
    const coach = await createUser(db, 'captain', 'limit');
    for (let i = 0; i < 5; i++) await link(coach, await createUser(db, 'player', `p${i}`), 30);
    await expect(link(coach, await createUser(db, 'player', 'p6'), 30)).rejects.toThrow(/5 active players/);
  });
});
