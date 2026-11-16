import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, expectTypeOf, it } from 'vitest';
import type { AppDatabase } from '../../src/types/app-database';
import type { FactKey } from '../../src/features/player-file/model';
import { customFormKinds, customFormQuestionTypes } from '../../src/types/enums';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let stranger: string;
const form = '00000000-0000-7000-8000-000000000001';
const question = '00000000-0000-7000-8000-000000000002';
const request = '00000000-0000-7000-8000-000000000003';
const answer = '00000000-0000-7000-8000-000000000004';
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  stranger = await createUser(db, 'captain');
});
afterAll(async () => { await db.close(); });

it('creates the four protected tables', async () => {
  expect((await db.query(`select tablename from pg_tables where schemaname='public'
    and tablename in ('forms','form_questions','form_requests','form_answers') and rowsecurity`)).rows).toHaveLength(4);
});
it('keeps application unions aligned with the database constraints and player facts', async () => {
  type Tables = AppDatabase['public']['Tables'];
  expectTypeOf<Tables['form_questions']['Row']['maps_to']>().toEqualTypeOf<FactKey | null>();
  expectTypeOf<Extract<'status' | 'answered_at', keyof Tables['form_requests']['Insert']>>().toEqualTypeOf<never>();
  for (const [table, column, values] of [
    ['forms', 'kind', customFormKinds], ['form_questions', 'type', customFormQuestionTypes],
  ] as const) {
    const result = await db.query<{ definition: string }>(`select pg_get_constraintdef(c.oid) as definition
      from pg_constraint c join pg_class t on t.oid=c.conrelid
      join pg_attribute a on a.attrelid=t.oid and a.attnum=any(c.conkey)
      where t.relname=$1 and a.attname=$2 and c.contype='c'`, [table, column]);
    const literals = [...(result.rows[0]?.definition ?? '').matchAll(/'([^']+)'::text/g)].map(m => m[1]);
    expect(literals).toEqual([...values]);
  }
});
it('lets the captain create a form, question and linked request', async () => {
  await asUser(db, captain, async tx => {
    await tx.query(`insert into forms(id,captain_id,title,kind) values ($1,$2,'Weekly','checkin')`, [form, captain]);
    await tx.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required,maps_to)
      values ($1,$2,0,'Weight','Weight','number',true,'weight')`, [question, form]);
    await tx.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required)
      values ('00000000-0000-7000-8000-000000000005',$1,1,'Pain','Pain','yesno',true)`, [form]);
    await tx.query(`insert into form_requests(id,form_id,player_id,captain_id) values ($1,$2,$3,$4)`, [request, form, player, captain]);
  });
});
it('isolates another captain from forms, questions, requests and answers', async () => {
  await asUser(db, stranger, async tx => {
    for (const table of ['forms', 'form_questions', 'form_requests', 'form_answers']) {
      expect((await tx.query(`select * from ${table}`)).rows).toHaveLength(0);
    }
    expect((await tx.query(`update forms set title='stolen' where id=$1 returning id`, [form])).rows).toHaveLength(0);
    expect((await tx.query(`update form_requests set captain_reply='stolen' where id=$1 returning id`, [request])).rows).toHaveLength(0);
  });
});
it('rejects requests to unlinked players', async () => {
  const unlinked = await createUser(db, 'player');
  await expect(asUser(db, captain, tx => tx.query(`insert into form_requests(id,form_id,player_id,captain_id)
    values (gen_random_uuid(),$1,$2,$3)`, [form, unlinked, captain]))).rejects.toThrow(/row-level security/);
});
it('rejects requests for expired and archived links', async () => {
  const former = await createUser(db, 'player');
  await db.query(`insert into coach_clients(captain_id,player_id,access_until)
    values ($1,$2,test_clock.today()-1)`, [captain, former]);
  const send = () => asUser(db, captain, tx => tx.query(`insert into form_requests(id,form_id,player_id,captain_id)
    values (gen_random_uuid(),$1,$2,$3)`, [form, former, captain]));
  await expect(send()).rejects.toThrow(/row-level security/);
  await db.query(`update coach_clients set access_until=test_clock.today()+30,pending=true where player_id=$1`, [former]);
  await expect(send()).rejects.toThrow(/row-level security/);
  await db.query(`update coach_clients set pending=false,frozen_at=now() where player_id=$1`, [former]);
  await expect(send()).rejects.toThrow(/row-level security/);
  await db.query(`update coach_clients set access_until=test_clock.today()+30,archived_at=now() where player_id=$1`, [former]);
  await expect(send()).rejects.toThrow(/row-level security/);
});
it('exposes matching form and questions only to the addressed player', async () => {
  await asUser(db, player, async tx => {
    for (const table of ['forms', 'form_questions', 'form_requests']) {
      expect((await tx.query(`select * from ${table}`)).rows).toHaveLength(table === 'form_questions' ? 2 : 1);
    }
  });
});
it('rejects an answer to someone else’s request', async () => {
  await expect(asUser(db, stranger, tx => tx.query(`insert into form_answers(id,request_id,question_id,value)
    values ($1,$2,$3,'70')`, [answer, request, question]))).rejects.toThrow();
});
it('marks the request answered when its last required answer arrives', async () => {
  await asUser(db, player, tx => tx.query(`insert into form_answers(id,request_id,question_id,value)
    values ($1,$2,$3,'null')`, [answer, request, question]));
  expect((await db.query(`select status from form_requests where id=$1`, [request])).rows).toEqual([{ status: 'pending' }]);
  await asUser(db, player, tx => tx.query(`update form_answers set value='70' where id=$1`, [answer]));
  expect((await db.query(`select status from form_requests where id=$1`, [request])).rows).toEqual([{ status: 'pending' }]);
  await asUser(db, player, tx => tx.query(`insert into form_answers(id,request_id,question_id,value)
    values ('00000000-0000-7000-8000-000000000006',$1,'00000000-0000-7000-8000-000000000005','false')`, [request]));
  expect((await db.query(`select answered_at,status from form_requests where id=$1`, [request])).rows)
    .toEqual([{ answered_at: new Date(TEST_NOW), status: 'answered' }]);
  await asUser(db, player, tx => tx.query(`update form_answers set value='null' where id=$1`, [answer]));
  expect((await db.query(`select answered_at,status from form_requests where id=$1`, [request])).rows)
    .toEqual([{ answered_at: null, status: 'pending' }]);
  await asUser(db, player, tx => tx.query(`update form_answers set value='70' where id=$1`, [answer]));
});
it('allows only the player to upload forms photos and only the request captain to read attached photos', async () => {
  const name = `forms/${player}/${request}/front.jpg`;
  await asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name) values ('checkin-photos',$1)`, [name]));
  await asUser(db, player, tx => tx.query(`update form_answers set photo_paths=$2 where id=$1`, [answer, [name]]));
  for (const user of [player, captain, stranger]) {
    expect((await asUser(db, user, tx => tx.query(`select name from storage.objects where name=$1`, [name]))).rows)
      .toHaveLength(user === stranger ? 0 : 1);
  }
  await expect(asUser(db, stranger, tx => tx.query(`insert into storage.objects(bucket_id,name)
    values ('checkin-photos',$1)`, [name.replace('front','stolen')]))).rejects.toThrow(/row-level security/);
  await expect(asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name)
    values ('checkin-photos',$1)`, [`forms/${player}/${form}/wrong.jpg`]))).rejects.toThrow(/row-level security/);
});
it('rejects a question from another form and foreign photo paths', async () => {
  await db.query(`insert into forms(id,captain_id,title,kind) values ($1,$2,'Other','custom')`, [answer, captain]);
  await db.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type)
    values ($1,$1,0,'Other','Other','text')`, [answer]);
  await expect(asUser(db, player, tx => tx.query(`insert into form_answers(id,request_id,question_id,value)
    values (gen_random_uuid(),$1,$2,'"x"')`, [request, answer]))).rejects.toThrow(/another form/);
  await expect(asUser(db, player, tx => tx.query(`update form_answers set photo_paths=$2 where id=$1`,
    [answer, [`forms/${stranger}/${request}/bad.jpg`]]))).rejects.toThrow(/photo path/);
  await asUser(db, captain, tx => tx.query(`delete from forms where id=$1`, [answer]));
  expect((await db.query(`select id from form_questions where id=$1`, [answer])).rows).toHaveLength(0);
});
it('rejects invalid schedule and fact mapping values', async () => {
  await expect(asUser(db, captain, tx => tx.query(`update forms set schedule='{"every":null,"hour":12}' where id=$1`, [form])))
    .rejects.toThrow(/check constraint/);
  await expect(asUser(db, captain, tx => tx.query(`update forms set schedule='{"every":"day","hour":24}' where id=$1`, [form])))
    .rejects.toThrow(/check constraint/);
  await expect(asUser(db, captain, tx => tx.query(`update form_questions set maps_to='unknown' where id=$1`, [question])))
    .rejects.toThrow(/answered_question_locked/);
});
it('prevents deleting a used form', async () => {
  await expect(asUser(db, captain, tx => tx.query(`delete from forms where id=$1`, [form]))).rejects.toThrow(/foreign key/);
});
it('locks inserts and edits once reviewed', async () => {
  await asUser(db, captain, tx => tx.query(`update form_requests set reviewed_at=$2 where id=$1`, [request, TEST_NOW]));
  expect((await db.query(`select status from form_requests where id=$1`, [request])).rows).toEqual([{ status: 'reviewed' }]);
  await expect(asUser(db, player, tx => tx.query(`update form_answers set value='71' where id=$1`, [answer]))).rejects.toThrow();
  await expect(asUser(db, player, tx => tx.query(`insert into form_answers(id,request_id,question_id,value)
    values (gen_random_uuid(),$1,$2,'71')`, [request, question]))).rejects.toThrow();
  await expect(asUser(db, player, tx => tx.query(`insert into storage.objects(bucket_id,name)
    values ('checkin-photos',$1)`, [`forms/${player}/${request}/late.jpg`]))).rejects.toThrow(/row-level security/);
});
