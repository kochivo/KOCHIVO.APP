import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let otherCaptain: string;
let otherPlayer: string;
let n = 0;
const id = () => `01900000-0000-7000-8000-${String(++n).padStart(12, '0')}`;
const as = (user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query(sql, params));
const upload = (user: string, name: string) =>
  as(user, `insert into storage.objects (bucket_id, name) values ('voice-notes', $1) returning name`, [name]);
const note = (user: string, target: string, path: string) => as(user, `insert into public.voice_notes
  (id, captain_id, player_id, audio_path, duration_seconds) values ($1, $2, $3, $4, 12) returning id`, [id(), user, target, path]);

beforeAll(async () => {
  db = await createTestDb();
  // The harness stub only grants select/insert; hosted Supabase also grants delete to authenticated.
  await db.query('grant delete on storage.objects to authenticated');
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: otherCaptain, player: otherPlayer } = await createCaptainWithPlayer(db));
});
afterAll(async () => { await db?.close(); });

describe('voice note files', () => {
  it('lets only the player’s captain upload into the player folder', async () => {
    expect((await upload(captain, `${player}/a.webm`)).rows).toHaveLength(1);
    await expect(upload(otherCaptain, `${player}/b.webm`)).rejects.toThrow(/row-level security/);
    await expect(upload(player, `${player}/c.webm`)).rejects.toThrow(/row-level security/);
    await expect(upload(captain, `${otherPlayer}/d.webm`)).rejects.toThrow(/row-level security/);
  });
  it('lets the player and their captain listen, nobody else', async () => {
    const read = (user: string) => as(user, `select name from storage.objects where bucket_id = 'voice-notes' and name = $1`, [`${player}/a.webm`]);
    expect((await read(player)).rows).toHaveLength(1);
    expect((await read(captain)).rows).toHaveLength(1);
    expect((await read(otherCaptain)).rows).toHaveLength(0);
    expect((await read(otherPlayer)).rows).toHaveLength(0);
  });
});

describe('voice note rows', () => {
  it('records notes only for the captain’s own players, inside the player folder', async () => {
    expect((await note(captain, player, `${player}/a.webm`)).rows).toHaveLength(1);
    await expect(note(otherCaptain, player, `${player}/x.webm`)).rejects.toThrow(/row-level security/);
    await expect(note(player, player, `${player}/y.webm`)).rejects.toThrow(/row-level security/);
    // Isolate the folder constraint after satisfying attachment ownership.
    await db.query(`insert into storage.objects(bucket_id,name,owner_id,owner)
      values('voice-notes',$1,$2,$3)`, [`${otherPlayer}/z.webm`, captain, captain]);
    await expect(note(captain, player, `${otherPlayer}/z.webm`)).rejects.toThrow(/check constraint/);
  });
  it('shows notes to both sides and lets the player only mark them heard', async () => {
    expect((await as(player, 'select audio_path from public.voice_notes')).rows).toEqual([{ audio_path: `${player}/a.webm` }]);
    expect((await as(otherCaptain, 'select id from public.voice_notes')).rows).toEqual([]);
    expect((await as(otherPlayer, 'select id from public.voice_notes')).rows).toEqual([]);
    expect((await as(player, 'update public.voice_notes set listened_at = now() returning id')).rows).toHaveLength(1);
    await expect(as(player, `update public.voice_notes set duration_seconds = 99`)).rejects.toThrow(/permission denied/);
    expect((await as(player, 'delete from public.voice_notes returning id')).rows).toEqual([]);
  });
  it('lets the recording captain delete the note and its file', async () => {
    expect((await as(otherCaptain, `delete from storage.objects where name = $1 returning name`, [`${player}/a.webm`])).rows).toEqual([]);
    expect((await as(captain, `delete from storage.objects where name = $1 returning name`, [`${player}/a.webm`])).rows).toHaveLength(1);
    expect((await as(captain, 'delete from public.voice_notes returning id')).rows).toHaveLength(1);
  });
  it('stops a suspended captain from recording', async () => {
    await db.query('update public.profiles set suspended_at = now() where id = $1', [captain]);
    try {
      await expect(upload(captain, `${player}/s.webm`)).rejects.toThrow(/row-level security|account suspended/);
      await expect(note(captain, player, `${player}/s.webm`)).rejects.toThrow(/row-level security|account suspended/);
    } finally { await db.query('update public.profiles set suspended_at = null where id = $1', [captain]); }
  });
});
