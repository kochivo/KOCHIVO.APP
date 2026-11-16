import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { notificationTypes } from '../../src/types/enums';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite;
let captain: string, player: string, otherCaptain: string, otherPlayer: string;
let sequence = 0;
const id = () => `01900000-0000-7000-8000-${String(++sequence).padStart(12, '0')}`;
const as = <T = Record<string, unknown>>(user: string, sql: string, params: unknown[] = []) => asUser(db, user, tx => tx.query<T>(sql, params));
const send = (user: string, c = captain, p = player, sender = user, body = 'hello') => as<{ id: string }>(user,
  `insert into public.chat_messages(id,captain_id,player_id,sender_id,body)
   values($1,$2,$3,$4,$5) returning id`, [id(), c, p, sender, body]);
const upload = (user: string, path: string) => as(user,
  `insert into storage.objects(bucket_id,name) values('voice-notes',$1) returning name`, [path]);

beforeAll(async () => {
  db = await createTestDb();
  await db.query('grant delete on storage.objects to authenticated');
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: otherCaptain, player: otherPlayer } = await createCaptainWithPlayer(db));
});
afterAll(async () => { await db?.close(); });

describe('chat ownership', () => {
  it('allows both participants to send, but rejects foreign captains, players and senders', async () => {
    expect((await send(player)).rows).toHaveLength(1);
    expect((await send(captain)).rows).toHaveLength(1);
    await expect(send(player, otherCaptain)).rejects.toThrow(/row-level security/);
    await expect(send(captain, captain, otherPlayer)).rejects.toThrow(/row-level security/);
    await expect(send(otherCaptain)).rejects.toThrow(/row-level security|check constraint/);
    await expect(send(player, captain, player, captain)).rejects.toThrow(/row-level security/);
    await expect(send(captain, captain, player, player)).rejects.toThrow(/row-level security/);
  });
  it('rejects pending and archived player links', async () => {
    for (const state of ["pending=true", "pending=false, archived_at=now()"]) {
      await db.query(`update public.coach_clients set ${state} where player_id=$1`, [player]);
      try { await expect(send(player)).rejects.toThrow(/row-level security/); }
      finally { await db.query('update public.coach_clients set pending=false,archived_at=null where player_id=$1', [player]); }
    }
  });
  it('hides the thread from third parties and limits read receipts to recipients', async () => {
    const messageId = (await send(player)).rows[0]?.id;
    expect((await as(otherPlayer, 'select * from public.chat_messages')).rows).toEqual([]);
    expect((await as(otherCaptain, 'select * from public.chat_messages')).rows).toEqual([]);
    expect((await as(player, 'update public.chat_messages set read_at=now() where id=$1 returning id', [messageId])).rows).toEqual([]);
    expect((await as(captain, 'update public.chat_messages set read_at=now() where id=$1 returning id', [messageId])).rows).toHaveLength(1);
    const replyId = (await send(captain)).rows[0]?.id;
    expect((await as(player, 'update public.chat_messages set read_at=now() where id=$1 returning id', [replyId])).rows).toHaveLength(1);
    await expect(as(player, "update public.chat_messages set body='changed'")).rejects.toThrow(/permission denied/);
    await expect(as(captain, 'delete from public.chat_messages')).rejects.toThrow(/permission denied/);
  });
  it('blocks suspended and unauthenticated callers', async () => {
    await expect(db.transaction(async tx => {
      await tx.exec('set local role anon');
      return tx.query('select * from public.chat_messages');
    })).rejects.toThrow(/permission denied/);
    await db.query('update public.profiles set suspended_at=now() where id=$1', [player]);
    try { await expect(send(player)).rejects.toThrow(/row-level security|suspended/); }
    finally { await db.query('update public.profiles set suspended_at=null where id=$1', [player]); }
  });
});

describe('chat content', () => {
  it('requires trimmed text with 1–1000 characters', async () => {
    for (const body of ['', ' ', ' padded ', 'x'.repeat(1001)]) {
      await expect(send(player, captain, player, player, body)).rejects.toThrow(/check constraint/);
    }
    expect((await send(player, captain, player, player, 'x'.repeat(1000))).rows).toHaveLength(1);
  });
  it('requires exactly one content kind, a matching folder, and voice duration', async () => {
    await upload(player, `${player}/chat/a.webm`);
    await upload(player, `${player}/chat/valid.webm`);
    // Isolate the row's folder constraint from the independent attachment-ownership check.
    await db.query(`insert into storage.objects(bucket_id,name,owner_id,owner)
      values('voice-notes',$1,$2,$3)`, [`${otherPlayer}/chat/a.webm`, player, player]);
    const insert = (body: string | null, path: string | null, duration: number | null) => as(player,
      `insert into public.chat_messages(id,captain_id,player_id,sender_id,body,audio_path,duration_seconds)
       values($1,$2,$3,$3,$4,$5,$6)`, [id(), captain, player, body, path, duration]);
    for (const [body, path, duration] of [
      [null, null, null], ['text', `${player}/chat/a.webm`, 1], ['text', null, 1],
      [null, `${player}/chat/a.webm`, null], [null, `${otherPlayer}/chat/a.webm`, 1],
      [null, `${player}/chat/a.webm`, 0], [null, `${player}/chat/a.webm`, 121],
    ] as const) await expect(insert(body, path, duration)).rejects.toThrow(/check constraint/);
    await insert(null, `${player}/chat/valid.webm`, 120);
    await expect(insert(null, `${player}/chat/valid.webm`, 120)).rejects.toThrow(/unique constraint/);
  });
});

describe('chat storage', () => {
  it('allows only own chat uploads and preserves existing participant reads', async () => {
    const path = `${player}/chat/one.webm`;
    expect((await upload(player, path)).rows).toHaveLength(1);
    await upload(captain, `${player}/chat/two.webm`);
    await expect(upload(player, `${otherPlayer}/chat/no.webm`)).rejects.toThrow(/row-level security/);
    await expect(upload(player, `${player}/other/no.webm`)).rejects.toThrow(/row-level security/);
    // Captain access before attachment leaked player uploads from previous conversations after transfer.
    for (const user of [player, captain]) expect((await as(user, 'select name from storage.objects where name=$1', [path])).rows).toHaveLength(user === player ? 1 : 0);
    expect((await as(otherCaptain, 'select name from storage.objects where name=$1', [path])).rows).toHaveLength(0);
  });
  it('lets either sender clean up failed uploads but protects saved audio', async () => {
    for (const user of [player, captain]) {
      const path = `${player}/chat/${id()}.webm`;
      await upload(user, path);
      expect((await as(otherPlayer, 'delete from storage.objects where name=$1 returning name', [path])).rows).toHaveLength(0);
      expect((await as(user, 'delete from storage.objects where name=$1 returning name', [path])).rows).toHaveLength(1);
    }
    const path = `${player}/chat/saved.webm`;
    await upload(player, path);
    await as(player, `insert into public.chat_messages(id,captain_id,player_id,sender_id,audio_path,duration_seconds)
      values($1,$2,$3,$3,$4,12)`, [id(), captain, player, path]);
    for (const user of [player, captain]) expect((await as(user, 'delete from storage.objects where name=$1 returning name', [path])).rows).toHaveLength(0);
  });
});

describe('chat notifications', () => {
  it('notifies the recipient, combines unread repeats, and starts a new row after reading', async () => {
    await db.query("delete from public.notifications where type='chat_message'");
    await send(player);
    await db.query("update public.notifications set created_at=now()-interval '1 day' where type='chat_message'");
    await send(player);
    const notices = await as(captain, "select payload,created_at=now() as fresh from public.notifications where type='chat_message'");
    expect(notices.rows).toEqual([{ payload: { name: 'player', player_id: player, captain_id: captain,
      message_id: expect.any(String) }, fresh: true }]);
    expect((await as(player, "select id from public.notifications where type='chat_message'")).rows).toHaveLength(0);
    await as(captain, "update public.notifications set is_read=true where type='chat_message'");
    await send(player);
    expect((await as(captain, "select id from public.notifications where type='chat_message'")).rows).toHaveLength(2);
    await send(captain);
    expect((await as(player, "select payload from public.notifications where type='chat_message'")).rows)
      .toEqual([{ payload: { name: 'captain', player_id: player, captain_id: captain, message_id: expect.any(String) } }]);
  });
  it('preserves every existing notification kind', async () => {
    for (const type of notificationTypes.filter(type => type !== 'chat_message')) {
      await expect(db.query('insert into public.notifications(user_id,type) values($1,$2)', [otherPlayer, type])).resolves.toBeDefined();
    }
  });
});
