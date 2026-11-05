import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

describe('captain_roster', () => {
  it('returns only owned, unarchived players, ordered by name, with nullable defaults', async () => {
    const { captain, player } = await createCaptainWithPlayer(db);
    await db.query('update public.profiles set full_name = $1 where id = $2', ['Ziad', player]);
    const second = await createUser(db, 'player', 'Amr');
    const archived = await createUser(db, 'player', 'Archived');
    await db.query(`insert into public.coach_clients (captain_id, player_id, started_on, access_until, archived_at)
      values ($1, $2, '2026-10-01', '2026-12-01', null), ($1, $3, '2026-10-01', '2026-12-01', '2026-10-31')`, [captain, second, archived]);
    await createCaptainWithPlayer(db);
    const result = await asUser(db, captain, (tx) => tx.query('select * from public.captain_roster()'));
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({ player_id: second, full_name: 'Amr', access_until: new Date('2026-12-01'), started_on: new Date('2026-10-01'), last_training_date: null, program_title: null, open_tasks: 0 });
    expect(result.rows[1]).toMatchObject({ player_id: player, full_name: 'Ziad' });
  });

  it('aggregates sessions and unreviewed tasks without multiplying counts', async () => {
    const { captain, player } = await createCaptainWithPlayer(db, '2026-10-19');
    await db.query(`insert into public.workout_sessions (id, player_id, training_date, started_at, client_updated_at)
      values (gen_random_uuid(), $1, '2026-10-30', '2026-10-30', '2026-10-30'),
             (gen_random_uuid(), $1, '2026-11-02', '2026-11-02', '2026-11-02')`, [player]);
    await db.query(`insert into public.programs (captain_id, player_id, title, status)
      values ($1, $2, 'Current', 'active'), ($1, $2, 'Old', 'archived')`, [captain, player]);
    await db.query(`insert into public.check_ins (player_id, captain_id, week_start, reviewed_at)
      values ($1, $2, '2026-10-19', null), ($1, $2, '2026-10-26', '2026-10-27')`, [player, captain]);
    const exercise = await db.query<{ id: string }>(`insert into public.exercises (name_en, name_ar, body_part) values ('Press', 'تمرين', 'chest') returning id`);
    await db.query(`insert into public.form_checks (player_id, captain_id, exercise_id, video_path, reviewed_at)
      values ($1, $2, $3, 'video', null), ($1, $2, $3, 'video2', null), ($1, $2, $3, 'video3', '2026-11-01')`, [player, captain, exercise.rows[0]?.id]);
    const result = await asUser(db, captain, (tx) => tx.query('select * from public.captain_roster()'));
    expect(result.rows).toEqual([expect.objectContaining({ player_id: player, last_training_date: new Date('2026-11-02'), program_title: 'Current', open_tasks: 3 })]);
  });

  it('returns no rows to a player even with their own relationship and history', async () => {
    const { player } = await createCaptainWithPlayer(db);
    expect((await asUser(db, player, (tx) => tx.query('select * from public.captain_roster()'))).rows).toEqual([]);
  });

  it('does not grant anon execute', async () => {
    const permissions = await db.query(`select has_function_privilege('anon', 'public.captain_roster()', 'EXECUTE') as allowed`);
    expect(permissions.rows).toEqual([{ allowed: false }]);
    await expect(db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      await tx.query('select * from public.captain_roster()');
    })).rejects.toThrow(/permission denied for function captain_roster/);
  });
});
