import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string, player: string, outsider: string;
let sequence = 0;
const send = (sender: string) => asUser(db, sender, tx => tx.query(
  `insert into public.chat_messages(id,captain_id,player_id,sender_id,body)
   values($1,$2,$3,$4,'hello') returning id`,
  [`00000000-0000-7000-8000-${String(++sequence).padStart(12, '0')}`, captain, player, sender]));
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  outsider = await createUser(db, 'player');
  await db.exec(`create schema net;
    create table net.requests(body jsonb);
    create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}',
      headers jsonb default '{}', timeout_milliseconds integer default 5000) returns bigint language plpgsql as $$
      begin insert into net.requests values(body); return 1; end $$;
    create or replace function security_private.push_config() returns jsonb language sql as $$
      select '{"push_function_url":"https://push.test","push_hook_secret":"secret","vapid_public_key":"public",
        "vapid_private_key":"private","vapid_subject":"mailto:test@example.com"}'::jsonb $$;`);
});
afterAll(async () => { await db.close(); });

it('pushes exactly once per inserted or coalesced message, never for reads or unchanged message ids', async () => {
  await send(player); await send(player);
  expect((await db.query('select * from net.requests')).rows).toHaveLength(2);
  const events = await db.query<{ body: { notification_id: string; message_id: string } }>('select body from net.requests');
  const claim = (body: { notification_id: string; message_id: string }) => db.query(
    'select public.claim_chat_push($1,$2) as claimed', [body.notification_id, body.message_id]);
  const first = events.rows[0]?.body, latest = events.rows[1]?.body;
  if (!first || !latest) throw new Error('Missing push events');
  expect(first.message_id).not.toBe(latest.message_id);
  expect((await claim(first)).rows).toEqual([{ claimed: false }]);
  expect((await claim(latest)).rows).toEqual([{ claimed: true }]);
  expect((await claim(latest)).rows).toEqual([{ claimed: false }]);
  expect((await db.query("select id from public.notifications where type='chat_message'")).rows).toHaveLength(1);
  await db.exec("update public.notifications set payload=payload, created_at=created_at where type='chat_message'");
  await asUser(db, captain, tx => tx.query('update public.chat_messages set read_at=now() where read_at is null'));
  expect((await db.query("select is_read from public.notifications where type='chat_message'")).rows).toEqual([{ is_read: true }]);
  expect((await db.query('select * from net.requests')).rows).toHaveLength(2);
  await send(player);
  expect((await db.query('select * from net.requests')).rows).toHaveLength(3);
});

it('reads all incoming history while preserving other participants and the sender’s receipts', async () => {
  for (let i = 0; i < 55; i++) await send(captain);
  await asUser(db, outsider, tx => tx.query('update public.chat_messages set read_at=now()'));
  await asUser(db, captain, tx => tx.query('update public.chat_messages set read_at=now() where sender_id=$1', [captain]));
  expect((await db.query('select id from public.chat_messages where sender_id=$1 and read_at is null', [captain])).rows).toHaveLength(55);
  await expect(asUser(db, outsider, tx => tx.query('select public.read_chat_conversation($1,$2,now())', [player, captain]))).rejects.toThrow(/not a conversation participant/);
  await asUser(db, player, tx => tx.query('select public.read_chat_conversation($1,$2,now())', [player, captain]));
  expect((await db.query('select id from public.chat_messages where sender_id=$1 and read_at is null', [captain])).rows).toHaveLength(0);
  expect((await db.query("select is_read from public.notifications where type='chat_message' and user_id=$1", [player])).rows).toEqual([{ is_read: true }]);
});

it('allows only the profile owner to save locale and grants the push worker its required columns', async () => {
  for (const role of ['anon', 'authenticated']) {
    expect((await db.query("select has_function_privilege($1,'public.claim_chat_push(uuid,uuid)','execute') as allowed", [role])).rows)
      .toEqual([{ allowed: false }]);
  }
  await asUser(db, player, tx => tx.query("update public.profiles set locale='en' where id=$1", [player]));
  await asUser(db, outsider, tx => tx.query("update public.profiles set locale='ar' where id=$1", [player]));
  expect((await db.query('select locale from public.profiles where id=$1', [player])).rows).toEqual([{ locale: 'en' }]);
  for (const column of ['id', 'locale', 'arabic_style', 'timezone']) {
    expect((await db.query("select has_column_privilege('service_role','public.profiles',$1,'select') as allowed", [column])).rows).toEqual([{ allowed: true }]);
  }
  await expect(asUser(db, player, tx => tx.query("update public.profiles set locale='fr' where id=$1", [player]))).rejects.toThrow(/check constraint/);
});
