import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb } from './harness';

let db: PGlite, captain: string, player: string;
const id = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;
beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  await db.query(`insert into forms(id,captain_id,title,kind) values ($1,$2,'Weekly','custom')`, [id(1), captain]);
  await db.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required)
    values ($1,$2,0,'Original','Original','text',true)`, [id(2), id(1)]);
  await db.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required)
    values ($1,$2,1,'Removed','Removed','text',true)`, [id(6), id(1)]);
  await asUser(db, captain, tx => tx.query(`insert into form_requests(id,form_id,player_id,captain_id)
    values ($1,$2,$3,$4)`, [id(3), id(1), player, captain]));
});
afterAll(async () => { await db.close(); });
it('keeps the sent question wording and requirements when the form changes before or after answering', async () => {
  await asUser(db, captain, async tx => {
    await tx.query('delete from form_questions where id=$1', [id(6)]);
    await tx.query(`update form_questions set label_en='Edited',required=false where id=$1`, [id(2)]);
    await tx.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required)
      values ($1,$2,1,'Added','Added','text',true)`, [id(4), id(1)]);
  });
  const submit = (value: string) => asUser(db, player, tx => tx.query(`select submit_custom_form_answers($1,$2::jsonb)`,
    [id(3), JSON.stringify([{ id: id(5), question_id: id(2), value, photo_paths: [] }])]));
  await submit('');
  expect((await db.query('select status from form_requests')).rows).toEqual([{ status: 'pending' }]);
  await submit('Answer');
  expect((await db.query('select status from form_requests')).rows).toEqual([{ status: 'answered' }]);
  await submit('Updated answer');
  expect((await db.query('select status from form_requests')).rows).toEqual([{ status: 'answered' }]);
  expect((await db.query(`select question_snapshot->0->>'label_en' as label,
    jsonb_array_length(question_snapshot) as count from form_requests`)).rows).toEqual([{ label: 'Original', count: 2 }]);
  await expect(asUser(db, captain, tx => tx.query(`update form_requests set question_snapshot='[]' where id=$1`, [id(3)])))
    .rejects.toThrow(/permission denied/);
});

it('keeps a legacy answered request complete when newly required questions have no answers', async () => {
  await db.query('update form_requests set question_snapshot=null where id=$1', [id(3)]);
  await asUser(db, player, tx => tx.query(`select submit_custom_form_answers($1,$2::jsonb)`,
    [id(3), JSON.stringify([{ id: id(5), question_id: id(2), value: 'Legacy edit', photo_paths: [] }])]));
  expect((await db.query('select status from form_requests')).rows).toEqual([{ status: 'answered' }]);
});
