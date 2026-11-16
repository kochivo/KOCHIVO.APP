import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser, TEST_NOW } from './harness';

let db: PGlite, captain: string, player: string, stranger: string, otherPlayer: string;
const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const form = id(1), photo = id(2), note = id(3), request = id(4);
const question = (qid: string, position: number, type = 'text') => ({ id: qid, form_id: form, position,
  label_ar: 'Question', label_en: 'Question', type, required: false, options: [], maps_to: null, alert_on: null });
const parent = () => ({ id: form, captain_id: captain, title: 'Original', kind: 'custom', schedule: null, remind_after_hours: null });
const submit = (user: string, answers: unknown[]) => asUser(db, user, tx =>
  tx.query('select submit_custom_form_answers($1,$2::jsonb)', [request, JSON.stringify(answers)]));
const save = (user: string, questions: unknown[], title = 'Changed') => asUser(db, user, tx =>
  tx.query('select save_custom_form($1::jsonb,$2::jsonb)', [JSON.stringify({ ...parent(), title }), JSON.stringify(questions)]));
const answers = () => [
  { id: id(5), question_id: photo, photo_paths: [`forms/${player}/${request}/front.jpg`] },
  { id: id(6), question_id: note, value: 'Hello', photo_paths: [] },
];
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  stranger = await createUser(db, 'captain'); otherPlayer = await createUser(db, 'player');
  await db.query(`insert into forms(id,captain_id,title,kind) values ($1,$2,'Original','custom')`, [form, captain]);
  await db.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required,maps_to)
    values ($1,$3,0,'Photo','Photo','photos',true,null),($2,$3,1,'Note','Note','text',false,'weight')`, [photo, note, form]);
  await db.query('insert into form_requests(id,form_id,player_id,captain_id) values ($1,$2,$3,$4)', [request, form, player, captain]);
});
afterAll(async () => { await db.close(); });

it('stores required photos and optional text atomically, preserving JSON null', async () => {
  await submit(player, answers().map(a => a.question_id === photo ? { ...a, value: null } : a));
  expect((await db.query('select value,value is null as sql_null from form_answers order by id')).rows)
    .toEqual([{ value: null, sql_null: false }, { value: 'Hello', sql_null: false }]);
  expect((await db.query('select status from form_requests')).rows).toEqual([{ status: 'answered' }]);
});
it('repairs an answered partial state and updates existing answers', async () => {
  await db.query('delete from form_answers where question_id=$1', [note]);
  await submit(player, answers().map(a => a.question_id === note ? { ...a, value: 'Retry' } : a));
  expect((await db.query('select value from form_answers where question_id=$1', [note])).rows).toEqual([{ value: 'Retry' }]);
  await submit(player, answers());
  expect((await db.query('select value from form_answers where question_id=$1', [note])).rows).toEqual([{ value: 'Hello' }]);
});
it('rejects another player and rolls back a batch with an invalid question', async () => {
  await expect(submit(otherPlayer, answers())).rejects.toThrow();
  await expect(submit(player, [{ ...answers()[1], value: 'Lost' }, { id: id(7), question_id: id(99) }])).rejects.toThrow();
  expect((await db.query('select value from form_answers where question_id=$1', [note])).rows).toEqual([{ value: 'Hello' }]);
});
it('rolls back parent and position changes on a bad question payload', async () => {
  await expect(save(captain, [question(photo, 0, 'invalid'), question(note, 1)])).rejects.toThrow();
  expect((await db.query('select title from forms')).rows).toEqual([{ title: 'Original' }]);
  expect((await db.query('select position from form_questions order by position')).rows).toEqual([{ position: 0 }, { position: 1 }]);
});
it('rejects another captain', async () => {
  await expect(save(stranger, [question(photo, 0), question(note, 1)])).rejects.toThrow();
});
it('locks answered mappings and types, but allows labels and added options', async () => {
  for (const change of ["maps_to='waist'", "type='number'"]) {
    await expect(asUser(db, captain, tx => tx.query(`update form_questions set ${change} where id=$1`, [note])))
      .rejects.toThrow(/answered_question_locked/);
  }
  await asUser(db, captain, tx => tx.query(`update form_questions set label_ar='Edited',options='[{"value":"a","label_ar":"A","label_en":"A"}]' where id=$1`, [note]));
  for (const options of [[], [{ value: 'a', label_ar: 'Renamed', label_en: 'A' }]]) {
    await expect(asUser(db, captain, tx => tx.query('update form_questions set options=$2 where id=$1', [note, JSON.stringify(options)])))
      .rejects.toThrow(/answered_question_locked/);
  }
});
it('allows owner saves, reorder and unrestricted edits to unanswered questions', async () => {
  const rows = (await db.query('select * from form_questions order by position')).rows;
  await save(captain, [...rows.reverse(), { ...question(id(8), 2), type: 'number', maps_to: 'waist' }]);
  await asUser(db, captain, tx => tx.query(`update form_questions set type='choice',maps_to='sex',options='[]' where id=$1`, [id(8)]));
  expect((await db.query('select title from forms')).rows).toEqual([{ title: 'Changed' }]);
});
it('rejects reviewed requests', async () => {
  await asUser(db, captain, tx => tx.query('update form_requests set reviewed_at=$2 where id=$1', [request, TEST_NOW]));
  await expect(submit(player, answers())).rejects.toThrow();
});

it('restricts RPC execution and keeps trigger functions private', async () => {
  for (const signature of ['submit_custom_form_answers(uuid,jsonb)', 'save_custom_form(jsonb,jsonb)']) {
    expect((await db.query(`select has_function_privilege('anon',$1,'execute') as anon,
      has_function_privilege('authenticated',$1,'execute') as authenticated`, [signature])).rows)
      .toEqual([{ anon: false, authenticated: true }]);
  }
  for (const signature of ['lock_answered_question_meaning()', 'lock_custom_form_answer_question()']) {
    expect((await db.query(`select has_function_privilege('authenticated',$1,'execute') as allowed`, [signature])).rows)
      .toEqual([{ allowed: false }]);
  }
});
