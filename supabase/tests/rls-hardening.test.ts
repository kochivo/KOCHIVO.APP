import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let owner: { captain: string; player: string };
let intruder: { captain: string; player: string };
const EXERCISE = '01900000-0000-8000-8000-000000000301';
const PROGRAM = '01900000-0000-8000-8000-000000000302';
const DAY = '01900000-0000-8000-8000-000000000303';
const ITEM = '01900000-0000-8000-8000-000000000304';
const SESSION = '01900000-0000-8000-8000-000000000305';
const SET = '01900000-0000-8000-8000-000000000306';
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
  await asUser(db, owner.player, async (tx) => {
    await tx.query(
      `insert into public.workout_sessions (id, program_day_id, training_date, started_at, client_updated_at) values ($1, $2, $3::date, $3, $3)`,
      [SESSION, DAY, NOW],
    );
    await tx.query(
      `insert into public.set_logs (id, session_id, program_exercise_id, exercise_id, set_index, reps, completed_at, client_updated_at)
       values ($1, $2, $3, $4, 1, 8, $5, $5)`,
      [SET, SESSION, ITEM, EXERCISE, NOW],
    );
  });
});

afterAll(async () => {
  await db.close();
});

async function can(role: string, fn: string) {
  const { rows } = await db.query<{ ok: boolean }>(`select has_function_privilege($1, $2, 'execute') as ok`, [role, fn]);
  return rows[0]?.ok;
}

describe('privileges (0014)', () => {
  it('anon can call only invite_preview.', async () => {
    expect(await can('anon', 'public.invite_preview(text)')).toBe(true);
    for (const fn of ['public.is_captain_of(uuid)', 'public.redeem_invite(text)', 'public.confirm_role(public.user_role)',
      'public.sync_set_logs(jsonb)', 'public.owns_session(uuid)']) {
      expect(await can('anon', fn)).toBe(false);
    }
  });

  it('Nobody can call trigger functions through the API.', async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const fn of ['public.handle_new_user()', 'public.enforce_player_limit()', 'public.set_inbox_captain()']) {
        expect(await can(role, fn)).toBe(false);
      }
    }
  });

  it('Signed-in users keep the helpers their policies need.', async () => {
    for (const fn of ['public.is_captain_of(uuid)', 'public.player_can_write()', 'public.storage_owner(text)', 'public.redeem_invite(text)']) {
      expect(await can('authenticated', fn)).toBe(true);
    }
  });

  it('anon has no table access.', async () => {
    const { rows } = await db.query<{ ok: boolean }>(`select has_table_privilege('anon', 'public.profiles', 'select') as ok`);
    expect(rows).toEqual([{ ok: false }]);
  });
});

describe('media ownership (0014)', () => {
  const formCheck = (user: string, setLog: string | null, path: string) => asUser(db, user, (tx) => tx.query(
    `insert into public.form_checks (exercise_id, set_log_id, video_path) values ($1, $2, $3)`, [EXERCISE, setLog, path],
  ));

  it('A player cannot attach another player’s set to a form check.', async () => {
    await expect(formCheck(intruder.player, SET, `${intruder.player}/a.mp4`)).rejects.toThrow(/row-level security/);
  });

  it('A player cannot point a form check at another player’s video.', async () => {
    await expect(formCheck(intruder.player, null, `${owner.player}/a.mp4`)).rejects.toThrow(/row-level security/);
  });

  it('A player can send a form check for their own set and video.', async () => {
    await formCheck(owner.player, SET, `${owner.player}/a.mp4`);
    const { rows } = await asUser(db, owner.player, (tx) => tx.query(`select count(*)::int as n from public.form_checks`));
    expect(rows).toEqual([{ n: 1 }]);
  });

  it('A check-in cannot reference photos outside the player’s folder.', async () => {
    const checkIn = (paths: string[]) => asUser(db, intruder.player, (tx) => tx.query(
      `insert into public.check_ins (week_start, photo_paths) values ('2026-11-02', $1)`, [paths],
    ));
    await expect(checkIn([`${intruder.player}/front.jpg`, `${owner.player}/front.jpg`])).rejects.toThrow(/row-level security/);
    await checkIn([`${intruder.player}/front.jpg`]);
  });
});
