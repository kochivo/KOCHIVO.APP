import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite, captain: string, player: string, nextCaptain: string;
const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const form = id(1), question = id(2), request = id(3);
const answer = { id: id(4), question_id: question, value: 'Answer', photo_paths: [] };
const submit = () => asUser(db, player, tx => tx.query('select submit_custom_form_answers($1,$2::jsonb)',
  [request, JSON.stringify([answer])]));
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  nextCaptain = await createUser(db, 'captain');
  await db.query(`insert into forms(id,captain_id,title,kind) values ($1,$2,'Form','custom')`, [form, captain]);
  await db.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type)
    values ($1,$2,0,'Question','Question','text')`, [question, form]);
  await db.query('insert into form_requests(id,form_id,player_id,captain_id) values ($1,$2,$3,$4)', [request, form, player, captain]);
});
afterAll(async () => { await db.close(); });

it('blocks frozen and expired inserts and updates, retaining awaiting-plans access', async () => {
  for (const change of ["frozen_at=now()", "access_until='2026-10-01'"]) {
    await db.query(`update coach_clients set ${change} where player_id=$1`, [player]);
    await expect(submit()).rejects.toThrow(/request is not answerable/);
    await db.query(`update coach_clients set frozen_at=null,access_until='2026-12-01' where player_id=$1`, [player]);
  }
  await submit();
  await db.query(`update coach_clients set frozen_at=now() where player_id=$1`, [player]);
  await expect(asUser(db, player, tx => tx.query(`update form_answers set value='"Changed"' where id=$1`, [answer.id])))
    .rejects.toThrow(/request is not answerable/);
  await db.query(`update coach_clients set frozen_at=null,access_until='2026-10-01',awaiting_plans_at=$2 where player_id=$1`, [player, TEST_NOW]);
  await submit();
  expect((await db.query('select value from form_answers')).rows).toEqual([{ value: 'Answer' }]);
});

it('closes review edits and photo access after transfer while preserving read history (T-290)', async () => {
  const path = `forms/${player}/${request}/photo.jpg`;
  await asUser(db, player, tx => tx.query('update form_answers set photo_paths=$1 where id=$2', [[path], answer.id]));
  await db.query(`insert into storage.objects(bucket_id,name,owner_id) values ('checkin-photos',$1,$2)`, [path, player]);
  const reads = (user: string, table: string) => asUser(db, user, tx => tx.query(`select * from ${table}`));
  expect((await reads(captain, 'form_requests')).rows).toHaveLength(1);
  expect((await reads(captain, 'form_answers')).rows).toHaveLength(1);
  expect((await reads(captain, 'storage.objects')).rows).toHaveLength(1);
  await asUser(db, captain, tx => tx.query('update form_requests set captain_reply=$1 where id=$2', ['Reply', request]));
  await db.query('update coach_clients set archived_at=$2 where player_id=$1', [player, TEST_NOW]);
  await db.query(`insert into coach_clients(captain_id,player_id,access_until) values ($1,$2,'2026-12-01')`, [nextCaptain, player]);
  for (const table of ['form_requests', 'form_answers']) {
    expect((await reads(captain, table)).rows).toHaveLength(1);
    expect((await reads(player, table)).rows).toHaveLength(1);
  }
  expect((await reads(captain, 'storage.objects')).rows).toHaveLength(0);
  expect((await reads(player, 'storage.objects')).rows).toHaveLength(1);
  expect((await asUser(db, captain, tx => tx.query(`update form_requests set captain_reply='Lost' where id=$1 returning id`, [request]))).rows).toEqual([]);
  expect((await db.query('select captain_reply from form_requests')).rows).toEqual([{ captain_reply: 'Reply' }]);
});

it('does not grant a pending relationship review access', async () => {
  await db.query('update coach_clients set archived_at=$2 where captain_id=$1', [nextCaptain, TEST_NOW]);
  await db.query('update coach_clients set archived_at=null,pending=true where captain_id=$1 and player_id=$2', [captain, player]);
  expect((await asUser(db, captain, tx => tx.query(`update form_requests set captain_reply='Lost' returning id`))).rows).toEqual([]);
});
