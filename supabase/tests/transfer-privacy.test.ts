import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';
import { runAs } from './cross-tenant-fixture';
import { fleetId } from './fleet-fixture';

let db: PGlite;
let captain: string, player: string, next: string;
const oldRequest = fleetId(90001), newRequest = fleetId(90002);
const question = fleetId(90003), oldAnswer = fleetId(90004);
const state = vi.hoisted(() => ({ client: {} }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => state.client }));
import { loadStartGate } from '../../src/features/player-shell/data/start-gate';

beforeAll(async () => {
  db = await createTestDb();
  await db.exec('grant delete on storage.objects to authenticated');
  ({ captain, player } = await createCaptainWithPlayer(db));
  ({ captain: next } = await createCaptainWithPlayer(db));
  await db.query(`insert into forms(id,captain_id,title,kind) values($1,$2,'Old','custom'),($3,$4,'New','custom')`,
    [oldRequest, captain, newRequest, next]);
  await db.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type)
    values($1,$2,0,'Test','Test','text'),($3,$4,0,'Test','Test','text')`, [question, oldRequest, newRequest, newRequest]);
  await db.query(`insert into form_requests(id,form_id,player_id,captain_id,blocks_access,sent_at)
    values($1,$1,$2,$3,true,'2026-11-01'),($4,$1,$2,$3,true,'2026-11-02')`, [oldRequest, player, captain, oldAnswer]);
  await runAs(db, player, `insert into form_answers(id,request_id,question_id,value) values($1,$2,$3,'"before"')`,
    [oldAnswer, oldAnswer, question]);
  for (const [owner, file] of [[captain, 'old'], [next, 'new']] as const) {
    const audio = `${player}/chat/${file}.webm`;
    await db.query(`insert into storage.objects(bucket_id,name,owner_id) values('voice-notes',$1,$2)`, [audio, owner]);
    await db.query(`insert into chat_messages(id,captain_id,player_id,sender_id,audio_path,duration_seconds)
      values($1,$2,$3,$2,$4,10)`, [file === 'old' ? oldRequest : newRequest, owner, player, audio]);
  }
  await db.query(`insert into storage.objects(bucket_id,name,owner_id) values('voice-notes',$1,$2)`, [`${player}/chat/orphan.webm`, captain]);
  await db.query('update coach_clients set archived_at=now() where player_id=$1', [player]);
  await db.query(`insert into coach_clients(captain_id,player_id,access_until) values($1,$2,'2026-12-03')`, [next, player]);
  await db.query(`insert into form_requests(id,form_id,player_id,captain_id,blocks_access) values($1,$1,$2,$3,true)`, [newRequest, player, next]);
});
afterAll(async () => { await db?.close(); });

it('scopes captain audio reads to the exact conversation', async () => {
  expect((await runAs(db, next, 'select name from storage.objects order by name')).rows)
    .toEqual([{ name: `${player}/chat/new.webm` }]);
});
it('preserves player folder access and uploader access to unattached audio', async () => {
  expect((await runAs(db, player, 'select name from storage.objects')).rows).toHaveLength(3);
  expect((await runAs(db, captain, 'select name from storage.objects')).rows).toHaveLength(2);
});
it('prevents the new captain from deleting an old orphan upload', async () => {
  expect((await runAs(db, next, 'delete from storage.objects where name=$1 returning name', [`${player}/chat/orphan.webm`])).rows).toEqual([]);
});
it('rejects new answers and edits to former captain requests', async () => {
  await expect(runAs(db, player, `insert into form_answers(id,request_id,question_id,value) values($1,$2,$3,'"after"')`,
    [oldRequest, oldRequest, question])).rejects.toThrow(/answerable|row-level security/);
  await expect(runAs(db, player, `update form_answers set value='"after"' where id=$1`, [oldAnswer])).rejects.toThrow(/answerable|row-level security/);
});
it('allows current captain answers and preserves former captain history', async () => {
  await runAs(db, player, `insert into form_answers(id,request_id,question_id,value) values($1,$1,$1,'"current"')`, [newRequest]);
  expect((await runAs(db, captain, 'select value from form_answers where id=$1', [oldAnswer])).rows).toEqual([{ value: 'before' }]);
  expect((await runAs(db, player, 'select value from form_answers where id=$1', [oldAnswer])).rows).toEqual([{ value: 'before' }]);
});
it('blocks photo uploads to former captain requests', async () => {
  await expect(runAs(db, player, `insert into storage.objects(bucket_id,name) values('checkin-photos',$1)`,
    [`forms/${player}/${oldRequest}/after.jpg`])).rejects.toThrow(/row-level security/);
  await runAs(db, player, `insert into storage.objects(bucket_id,name) values('checkin-photos',$1)`, [`forms/${player}/${newRequest}/ok.jpg`]);
});
it('loads only current captain blocking forms through the start gate', async () => {
  // Execute the loader's filters against real RLS, without a network client.
  state.client = {
    auth: { getUser: async () => ({ data: { user: { id: player } } }) },
    from: (table: string) => {
      const filters: [string, unknown][] = [];
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return query; },
        order: () => query,
        single: async () => ({ data: { full_name: 'Player' } }),
        range: async () => {
          const where = filters.map(([key], i) => `${key}=$${i + 1}`).join(' and ');
          const result = await runAs(db, player, `select * from ${table} where ${where}`, filters.map(([, value]) => value));
          return { data: result.rows };
        },
      };
      return query;
    },
    rpc: async () => ({ data: (await asUser(db, player, tx => tx.query<{ captain: string | null }>(
      'select my_captain_id() as captain'))).rows[0]?.captain }),
  };
  expect((await loadStartGate()).rows.map(row => row.id)).toEqual([newRequest]);
});

it('isolates legacy voice notes by their exact row captain after transfer', async () => {
  for (const [owner, file, id] of [[captain, 'old-note', fleetId(90005)], [next, 'new-note', fleetId(90006)]] as const) {
    const audio = `${player}/${file}.webm`;
    await db.query(`insert into storage.objects(bucket_id,name) values('voice-notes',$1)`, [audio]);
    await db.query(`insert into voice_notes(id,captain_id,player_id,audio_path,duration_seconds)
      values($1,$2,$3,$4,10)`, [id, owner, player, audio]);
  }
  for (const [user, files] of [[next, ['new-note']], [captain, ['old-note']], [player, ['new-note', 'old-note']]] as const) {
    expect((await runAs(db, user, "select name from storage.objects where name like '%-note.webm' order by name")).rows)
      .toEqual(files.map(file => ({ name: `${player}/${file}.webm` })));
  }
});

it('keeps suspended callers out of voice storage and assessment writes', async () => {
  await db.query('update profiles set suspended_at=now() where id=$1', [player]);
  try {
    expect((await runAs(db, player, 'select name from storage.objects')).rows).toEqual([]);
    expect((await runAs(db, player, `update form_answers set value='"blocked"' where id=$1 returning id`, [newRequest])).rows).toEqual([]);
  } finally {
    await db.query('update profiles set suspended_at=null where id=$1', [player]);
  }
});

it('lets the original uploader clean up an orphan while protecting attached audio', async () => {
  expect((await runAs(db, captain, 'delete from storage.objects where name=$1 returning name', [`${player}/chat/orphan.webm`])).rows).toHaveLength(1);
  expect((await runAs(db, captain, 'delete from storage.objects where name=$1 returning name', [`${player}/chat/old.webm`])).rows).toEqual([]);
});

it('lets a captain read the upload response before attaching the audio', async () => {
  const path = `${player}/chat/upload-response.webm`;
  expect((await runAs(db, next, `insert into storage.objects(bucket_id,name)
    values('voice-notes',$1) returning name,owner_id,owner`, [path])).rows)
    .toEqual([{ name: path, owner_id: next, owner: next }]);
});

it('rejects rebinding either audio row type to the former captain upload with 42501', async () => {
  const path = `${player}/chat/old.webm`;
  for (const table of ['voice_notes', 'chat_messages']) {
    const sender = table === 'chat_messages' ? ',sender_id' : '';
    const value = table === 'chat_messages' ? ',$2' : '';
    await expect(runAs(db, next, `insert into ${table}(id,captain_id,player_id,audio_path,duration_seconds${sender})
      values($1,$2,$3,$4,10${value})`, [fleetId(table === 'voice_notes' ? 90010 : 90011), next, player, path]))
      .rejects.toMatchObject({ code: '42501' });
  }
});

it('requires an existing voice-notes object owned by the sender', async () => {
  for (const table of ['voice_notes', 'chat_messages']) {
    for (const kind of ['missing', 'wrong-bucket', 'unowned']) {
      const path = `${player}/chat/${table}-${kind}.webm`;
      if (kind !== 'missing') await db.query(`insert into storage.objects(bucket_id,name,owner_id)
        values($1,$2,$3)`, [kind === 'wrong-bucket' ? 'form-videos' : 'voice-notes', path, kind === 'unowned' ? null : next]);
      const sender = table === 'chat_messages' ? ',sender_id' : '';
      const value = table === 'chat_messages' ? ',$1' : '';
      await expect(runAs(db, next, `insert into ${table}(id,captain_id,player_id,audio_path,duration_seconds${sender})
        values(gen_random_uuid(),$1,$2,$3,10${value})`, [next, player, path])).rejects.toMatchObject({ code: '42501' });
    }
  }
});

it('preserves captain and player chat sends and captain voice-note creation after uploading', async () => {
  for (const [table, user] of [['voice_notes', next], ['chat_messages', next], ['chat_messages', player]] as const) {
    const path = `${player}/chat/${table}-${user}.webm`;
    await runAs(db, user, `insert into storage.objects(bucket_id,name) values('voice-notes',$1)`, [path]);
    const sender = table === 'chat_messages' ? ',sender_id' : '';
    const value = table === 'chat_messages' ? ',$4' : '';
    const params = table === 'chat_messages' ? [next, player, path, user] : [next, player, path];
    expect((await runAs(db, user, `insert into ${table}(id,captain_id,player_id,audio_path,duration_seconds${sender})
      values(gen_random_uuid(),$1,$2,$3,10${value}) returning audio_path`, params)).rows).toEqual([{ audio_path: path }]);
  }
});

it('checks uploader ownership on audio-path updates without blocking read receipts', async () => {
  // Normal grants forbid path edits; exercise the guard even if a future grant permits them.
  await db.exec('grant update(audio_path) on voice_notes,chat_messages to authenticated');
  try {
    for (const table of ['voice_notes', 'chat_messages']) {
      const ownPath = `${player}/chat/${table}-replacement.webm`;
      await runAs(db, player, `insert into storage.objects(bucket_id,name) values('voice-notes',$1)`, [ownPath]);
      for (const path of [`${player}/chat/old.webm`, `${player}/chat/missing-update.webm`]) {
        await expect(runAs(db, player, `update ${table} set audio_path=$1 where audio_path=$2`,
          [path, `${player}/chat/${table}-${next}.webm`])).rejects.toMatchObject({ code: '42501' });
      }
      expect((await runAs(db, player, `update ${table} set audio_path=$1 where audio_path=$2 returning audio_path`,
        [ownPath, `${player}/chat/${table}-${next}.webm`])).rows).toEqual([{ audio_path: ownPath }]);
      const receipt = table === 'voice_notes' ? 'listened_at' : 'read_at';
      expect((await runAs(db, player, `update ${table} set ${receipt}=now() where audio_path=$1 returning id`, [ownPath])).rows).toHaveLength(1);
    }
  } finally {
    await db.exec('revoke update(audio_path) on voice_notes,chat_messages from authenticated');
  }
});
