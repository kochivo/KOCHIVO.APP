import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string, player: string, other: string;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
  await db.query(`insert into public.chat_messages(id,captain_id,player_id,sender_id,body,created_at,read_at) values
    ('01900000-0000-7000-8000-000000000001',$1,$2,$2,'old','2026-11-01T10:00:00Z',null),
    ('01900000-0000-7000-8000-000000000002',$1,$2,$2,'read','2026-11-02T10:00:00Z','2026-11-02T11:00:00Z'),
    ('01900000-0000-7000-8000-000000000003',$1,$2,$1,'reply','2026-11-03T10:00:00Z',null),
    ('01900000-0000-7000-8000-000000000004',$1,$2,$2,'latest','2026-11-03T10:00:00Z',null)`, [captain, player]);
});
afterAll(async () => { await db?.close(); });
const previews = (user: string) => asUser(db, user, tx => tx.query('select * from public.inbox_previews()'));

it('returns the latest message with a deterministic tie break and incoming unread count', async () => {
  expect((await previews(captain)).rows).toMatchObject([{ player_id: player, kind: 'text',
    body: 'latest', sender_id: player, unread_count: 2 }]);
  expect((await previews(captain)).rows).toHaveLength(1);
});
it('does not expose another captain’s conversations or player callers', async () => {
  expect((await previews(other)).rows).toEqual([]);
  expect((await previews(player)).rows).toEqual([]);
});
it('keeps players without messages and isolates two populated captains', async () => {
  const second = await createCaptainWithPlayer(db);
  expect((await previews(second.captain)).rows).toMatchObject([{ player_id: second.player,
    id: null, kind: null, unread_count: 0 }]);
  expect((await previews(captain)).rows).toHaveLength(1);
});
it('returns voice metadata without an audio path or signed URL', async () => {
  await db.query(`insert into public.chat_messages(id,captain_id,player_id,sender_id,audio_path,duration_seconds,created_at)
    values('01900000-0000-7000-8000-000000000005',$1,$2,$2,$3,18,'2026-11-03T11:00:00Z')`,
  [captain, player, `${player}/chat/preview.webm`]);
  const row = (await previews(captain)).rows[0];
  expect(row).toMatchObject({ kind: 'voice', body: null, duration_seconds: 18, unread_count: 3 });
  expect(row).not.toHaveProperty('audio_path');
  expect(row).not.toHaveProperty('url');
});
it('respects suspension RLS', async () => {
  await db.query("update public.profiles set suspended_at='2026-11-03T12:00:00Z' where id=$1", [captain]);
  try { expect((await previews(captain)).rows).toEqual([]); }
  finally { await db.query('update public.profiles set suspended_at=null where id=$1', [captain]); }
});
