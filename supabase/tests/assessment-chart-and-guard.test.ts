import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite, captain: string, player: string, other: string;
let policies: unknown[];
const form = '00000000-0000-7000-8000-000000000201';
const question = '00000000-0000-7000-8000-000000000202';
const legacy = '00000000-0000-7000-8000-000000000203';
beforeAll(async () => {
  db = await createTestDb(async (file, database) => {
    if (!file.startsWith('0101_')) return;
    policies = (await database.query(`select * from pg_policies where schemaname='public'
      and tablename in ('forms','form_questions') order by tablename,policyname`)).rows;
    const owner = await createUser(database, 'captain');
    await database.query(`insert into forms(id,captain_id,title,kind) values($1,$2,'Weekly','checkin'),(gen_random_uuid(),$2,'Weekly','checkin')`, [legacy, owner]);
    await database.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type)
      values($1,$1,0,'الوزن','Weight','number')`, [legacy]);
  });
  ({ captain, player } = await createCaptainWithPlayer(db));
  other = await createUser(db, 'captain');
});
afterAll(async () => { await db.close(); });

it('keeps existing questions enabled and leaves both legacy duplicates and RLS policies intact', async () => {
  expect((await db.query('select show_chart from form_questions where id=$1', [legacy])).rows).toEqual([{ show_chart: true }]);
  expect((await db.query('select id from forms where creation_key is null')).rows).toHaveLength(2);
  expect((await db.query(`select * from pg_policies where schemaname='public'
    and tablename in ('forms','form_questions') order by tablename,policyname`)).rows).toEqual([
    ...policies,
    ...['form_questions', 'forms'].flatMap(tablename => ['DELETE', 'INSERT', 'SELECT', 'UPDATE'].map(cmd => ({
      schemaname: 'public', tablename, policyname: `first_party_${cmd.toLowerCase()}`,
      permissive: 'RESTRICTIVE', roles: ['authenticated'], cmd,
      qual: cmd === 'INSERT' ? null : '(NOT is_oauth_client())',
      with_check: ['INSERT', 'UPDATE'].includes(cmd) ? '(NOT is_oauth_client())' : null,
    }))),
  ].sort((a, b) => {
    const key = (row: unknown) => {
      const { tablename, policyname } = row as { tablename: string; policyname: string };
      return `${tablename}/${policyname}`;
    };
    return key(a) < key(b) ? -1 : 1;
  }));
});

it('preserves default chart behavior, saves preferences and copies them', async () => {
  await asUser(db, captain, async tx => {
    await tx.query(`insert into forms(id,captain_id,title,kind,creation_key) values($1,$2,'Weekly','checkin',$1)`, [form, captain]);
    await tx.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type)
      values($1,$2,0,'الوزن','','number')`, [question, form]);
    expect((await tx.query(`select show_chart from form_questions where id=$1`, [question])).rows).toEqual([{ show_chart: true }]);
    await tx.query(`update form_questions set show_chart=false where id=$1`, [question]);
    await tx.query(`insert into form_questions(id,form_id,position,label_ar,label_en,type,show_chart)
      select gen_random_uuid(),form_id,1,label_ar,label_en,type,show_chart from form_questions where id=$1`, [question]);
    expect((await tx.query(`select show_chart from form_questions where form_id=$1`, [form])).rows).toEqual([{ show_chart: false }, { show_chart: false }]);
  });
});

it('rejects a second form for the same copy action without deleting old forms', async () => {
  await expect(asUser(db, captain, tx => tx.query(`insert into forms(id,captain_id,title,kind,creation_key)
    values(gen_random_uuid(),$1,'Weekly','checkin',$2)`, [captain, form]))).rejects.toThrow(/forms_creation_key/);
  expect((await db.query(`select id from forms where id=$1`, [form])).rows).toEqual([{ id: form }]);
  await asUser(db, captain, tx => tx.query(`insert into forms(id,captain_id,title,kind)
    values(gen_random_uuid(),$1,'Weekly','checkin'),(gen_random_uuid(),$1,'Weekly','checkin')`, [captain]));
});

it('keeps question RLS for captains, addressed players and suspended users unchanged', async () => {
  await asUser(db, other, async tx => {
    expect((await tx.query(`select id from form_questions where form_id=$1`, [form])).rows).toEqual([]);
    expect((await tx.query(`update form_questions set show_chart=true where id=$1 returning id`, [question])).rows).toEqual([]);
  });
  await asUser(db, captain, tx => tx.query(`insert into form_requests(id,form_id,captain_id,player_id)
    values(gen_random_uuid(),$1,$2,$3)`, [form, captain, player]));
  await asUser(db, player, async tx => {
    expect((await tx.query(`select show_chart from form_questions where id=$1`, [question])).rows).toEqual([{ show_chart: false }]);
    expect((await tx.query(`update form_questions set show_chart=true where id=$1 returning id`, [question])).rows).toEqual([]);
  });
  await db.query(`update profiles set suspended_at=now() where id=$1`, [captain]);
  expect((await asUser(db, captain, tx => tx.query(`select id from form_questions where form_id=$1`, [form]))).rows).toEqual([]);
});
