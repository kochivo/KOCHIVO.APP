import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let otherCaptain: string;
let otherPlayer: string;
const CHECKIN = '01900000-0000-8000-8000-000000000201';

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db, '2026-11-02'));
  ({ captain: otherCaptain, player: otherPlayer } = await createCaptainWithPlayer(db));
});

afterAll(async () => { await db.close(); });

async function checkIn(week: string, id: string = CHECKIN) {
  return asUser(db, player, (tx) => tx.query(
    `insert into public.check_ins (id, captain_id, week_start, body_weight_kg, notes)
     values ($1, $2, $3, 80, 'تمام') returning captain_id`, [id, otherCaptain, week],
  ));
}

describe('inbox isolation', () => {
  it('A check-in always receives the player’s actual captain even when a different captain is submitted.', async () => {
    const result = await checkIn('2026-11-02');
    expect(result.rows).toEqual([{ captain_id: captain }]);
  });

  it('A player cannot submit two check-ins for the same week.', async () => {
    await checkIn('2026-11-09', '01900000-0000-8000-8000-000000000202');
    await expect(checkIn('2026-11-09', '01900000-0000-8000-8000-000000000203'))
      .rejects.toMatchObject({ code: '23505', constraint: 'check_ins_player_id_week_start_key' });
  });

  it('Only the captain can change review fields and the captain cannot change the player’s body fields.', async () => {
    const id = '01900000-0000-8000-8000-000000000204';
    await checkIn('2026-11-16', id);
    await asUser(db, captain, (tx) => tx.query(
      `update public.check_ins set reviewed_at = '2026-11-17T08:00:00Z', captain_reply = 'كمل' where id = $1`, [id],
    ));
    for (const field of ["captain_reply = 'Changed'", "reviewed_at = null"]) {
      expect((await asUser(db, player, (tx) => tx.query(
        `update public.check_ins set ${field} where id = $1 returning id`, [id],
      ))).rows).toHaveLength(0);
    }
    for (const field of ['body_weight_kg = 85', 'waist_cm = 90', "notes = 'Changed'", "photo_paths = array['changed.jpg']"]) {
      await expect(asUser(db, captain, (tx) => tx.query(
        `update public.check_ins set ${field} where id = $1`, [id],
      ))).rejects.toThrow(/only review fields can change/);
    }
    const result = await asUser(db, player, (tx) => tx.query(
      `select body_weight_kg::text, notes, reviewed_at::text, captain_reply from public.check_ins where id = $1`, [id],
    ));
    expect(result.rows).toEqual([{
      body_weight_kg: '80.0', notes: 'تمام', reviewed_at: '2026-11-17 08:00:00+00', captain_reply: 'كمل',
    }]);
  });

  it('The inbox view shows a captain only their own check-ins and form checks.', async () => {
    const exercise = '01900000-0000-8000-8000-000000000205';
    await db.query(`insert into public.exercises (id, name_en, name_ar, body_part) values ($1, 'Squat', 'سكوات', 'legs')`, [exercise]);
    for (const [owner, trainee] of [[captain, player], [otherCaptain, otherPlayer]] as const) {
      await asUser(db, trainee, async (tx) => {
        await tx.query(`insert into public.check_ins (captain_id, week_start) values ($1, '2026-11-23')`, [owner]);
        await tx.query(`insert into public.form_checks (captain_id, exercise_id, video_path) values ($1, $2, $3)`,
          [owner, exercise, `${trainee}/squat.mp4`]);
      });
    }
    const expected = await db.query<{ id: string; kind: string; captain_id: string }>(
      `select id, kind, captain_id from public.inbox_items where captain_id = $1 order by id`, [captain],
    );
    expect(expected.rows.length).toBeGreaterThanOrEqual(2);
    expect(expected.rows.map((row) => row.kind)).toContain('check_in');
    expect(expected.rows.map((row) => row.kind)).toContain('form_check');
    const result = await asUser(db, captain, (tx) => tx.query(`select id, kind, captain_id from public.inbox_items order by id`));
    expect(result.rows).toEqual(expected.rows);
  });
});
