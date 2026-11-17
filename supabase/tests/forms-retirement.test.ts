import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite, captain: string, player: string;
const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const form = id(1), old = id(2), fresh = id(5);
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  await db.query(`insert into forms(id,captain_id,title,kind) values ($1,$2,'Form','custom')`, [form, captain]);
  await db.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required)
    values ($1,$2,0,'Original','Original','text',true)`, [old, form]);
  await db.query('insert into form_requests(id,form_id,player_id,captain_id) values ($1,$2,$3,$4)', [id(3), form, player, captain]);
  await asUser(db, player, tx => tx.query('select submit_custom_form_answers($1,$2::jsonb)',
    [id(3), JSON.stringify([{ id: id(4), question_id: old, value: 'History' }])]));
});
afterAll(async () => { await db.close(); });
it('saves after omitting an answered question and preserves its answer and sent snapshot', async () => {
  const questions = [{ id: fresh, form_id: form, label_ar: 'New', label_en: 'New', type: 'text', required: true }];
  await asUser(db, captain, tx => tx.query('select save_custom_form($1::jsonb,$2::jsonb)',
    [JSON.stringify({ id: form, captain_id: captain, title: 'Changed', kind: 'custom' }), JSON.stringify(questions)]));
  expect((await db.query('select retired_at is not null as retired from form_questions where id=$1', [old])).rows).toEqual([{ retired: true }]);
  expect((await db.query('select value from form_answers')).rows).toEqual([{ value: 'History' }]);
  for (let i = 0; i < 40; i++) {
    await asUser(db, captain, tx => tx.query('select save_custom_form($1::jsonb,$2::jsonb)',
      [JSON.stringify({ id: form, captain_id: captain, title: 'Changed', kind: 'custom' }), JSON.stringify(questions)]));
  }
  expect((await db.query('select max(position) as maximum from form_questions')).rows).toEqual([{ maximum: 1 }]);
  expect((await db.query(`select question_snapshot->0->>'label_en' as label from form_requests where id=$1`, [id(3)])).rows)
    .toEqual([{ label: 'Original' }]);
  await asUser(db, captain, tx => tx.query('insert into form_requests(id,form_id,player_id,captain_id,sent_at) values ($1,$2,$3,$4,now()+interval \'1 hour\')',
    [id(6), form, player, captain]));
  expect((await db.query(`select jsonb_array_length(question_snapshot) as count,question_snapshot->0->>'id' as question
    from form_requests where id=$1`, [id(6)])).rows).toEqual([{ count: 1, question: fresh }]);
  await expect(asUser(db, player, tx => tx.query('select submit_custom_form_answers($1,$2::jsonb)',
    [id(6), JSON.stringify([{ id: id(7), question_id: old, value: 'Not requested' }])]))).rejects.toThrow();
  await asUser(db, player, tx => tx.query('select submit_custom_form_answers($1,$2::jsonb)',
    [id(3), JSON.stringify([{ id: id(4), question_id: old, value: 'Updated history' }])]));
  expect((await db.query('select status from form_requests where id=$1', [id(3)])).rows).toEqual([{ status: 'answered' }]);
});
