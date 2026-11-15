import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
async function form(captain: string, archived = false, question = true) {
  const row = (await db.query<{ id: string }>(`insert into forms(id,captain_id,title,kind,archived_at)
    values(gen_random_uuid(),$1,'Intake','custom',case when $2 then now() end) returning id`, [captain, archived])).rows[0];
  if (!row) throw new Error('Missing form');
  if (question) await db.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,required)
    values(gen_random_uuid(),$1,0,'الهدف','Goal','text',true)`, [row.id]);
  return row.id;
}
async function invite(captain: string, forms: string[], gate = true) {
  return asUser(db, captain, tx => tx.query<{ code: string }>(`select create_player_invite_v2(
    'Ali',null,null,'days',30,500,200,false,'2026-11-03',$1::uuid[],$2) as code`, [forms, gate]));
}
it('rejects foreign, archived, empty, duplicate and more than five forms atomically', async () => {
  const captain = await createUser(db, 'captain'), other = await createUser(db, 'captain');
  const own = await form(captain);
  for (const ids of [[await form(other)], [await form(captain, true)], [await form(captain, false, false)],
    [own,own], Array.from({ length: 6 }, () => own)]) {
    await expect(invite(captain, ids)).rejects.toThrow();
  }
  expect((await db.query('select id from coach_invites where captain_id=$1', [captain])).rows).toHaveLength(0);
});
it.each([true,false])('redeems with blocks_access=%s and isolates invite forms and requests', async gate => {
  const captain = await createUser(db, 'captain'), other = await createUser(db, 'captain');
  const player = await createUser(db, 'player'), outsider = await createUser(db, 'player');
  const ids = [await form(captain), await form(captain)];
  const code = (await invite(captain, ids, gate)).rows[0]?.code;
  expect((await asUser(db, captain, tx => tx.query('select * from coach_invite_forms'))).rows).toHaveLength(2);
  for (const user of [other,player,outsider]) expect((await asUser(db,user,tx => tx.query('select * from coach_invite_forms'))).rows).toHaveLength(0);
  await expect(asUser(db,captain,tx => tx.query('insert into coach_invite_forms select invite_id,form_id,position from coach_invite_forms'))).rejects.toMatchObject({ code: '42501' });
  await asUser(db,player,tx => tx.query('select redeem_invite($1)', [code]));
  const rows = (await asUser(db,player,tx => tx.query('select blocks_access,due_at,answered_at from form_requests'))).rows;
  expect(rows).toEqual(ids.map(() => ({ blocks_access: gate, due_at: null, answered_at: null })));
  expect((await asUser(db,captain,tx => tx.query('select id from form_requests where player_id=$1', [player]))).rows).toHaveLength(2);
  for (const user of [other,outsider]) expect((await asUser(db,user,tx => tx.query('select id from form_requests where player_id=$1', [player]))).rows).toHaveLength(0);
  await expect(asUser(db,player,tx => tx.query('select redeem_invite($1)', [code]))).rejects.toThrow(/invalid or expired/);
});
it('preserves activation, payment and no requests for invites without forms', async () => {
  const captain = await createUser(db,'captain'), player = await createUser(db,'player');
  const code = (await invite(captain, [])).rows[0]?.code;
  await asUser(db,player,tx => tx.query('select redeem_invite($1)', [code]));
  expect((await db.query('select pending from coach_clients where player_id=$1', [player])).rows).toEqual([{ pending: false }]);
  expect((await db.query('select price_egp,amount_egp from player_payments where player_id=$1', [player])).rows).toEqual([{ price_egp: 500, amount_egp: 200 }]);
  expect((await db.query('select id from form_requests where player_id=$1', [player])).rows).toHaveLength(0);
});
it('accepts five forms, and the gate clears only after the last required answer', async () => {
  const captain = await createUser(db,'captain'), player = await createUser(db,'player');
  const forms = [];
  for (let i = 0; i < 5; i++) forms.push(await form(captain));
  const code = (await invite(captain, forms)).rows[0]?.code;
  await asUser(db,player,tx => tx.query('select redeem_invite($1)', [code]));
  const requests = (await db.query<{ id: string; question_id: string }>(`select r.id,q.id as question_id
    from form_requests r join form_questions q on q.form_id=r.form_id where r.player_id=$1 order by r.id`, [player])).rows;
  expect(requests).toHaveLength(5);
  for (const [index, row] of requests.entries()) {
    await asUser(db,player,tx => tx.query(`insert into form_answers(id,request_id,question_id,value)
      values(gen_random_uuid(),$1,$2,'"Build strength"')`, [row.id,row.question_id]));
    const pending = await asUser(db,player,tx => tx.query(`select id from form_requests
      where player_id=$1 and blocks_access and answered_at is null`, [player]));
    expect(pending.rows).toHaveLength(4-index);
  }
});
