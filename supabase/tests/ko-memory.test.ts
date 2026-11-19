import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { TEST_NOW, asUser, createCaptainWithPlayer, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let player: string;
let outsider: string;
const uuid = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;

beforeAll(async () => {
  db = await createTestDb();
  ({ captain, player } = await createCaptainWithPlayer(db));
  outsider = await createUser(db, 'captain');
});
afterAll(async () => db?.close());

function insert(actor: string, n: number, text: string, target: string | null = null, owner = actor) {
  return asUser(db, actor, tx => tx.query(
    'insert into public.ko_memories (id, user_id, kind, text, player_id) values ($1,$2,\'note\',$3,$4)',
    [uuid(n), owner, text, target],
  ));
}

it('isolates owner reads, deletes and inserts and checks roster ownership', async () => {
  await insert(captain, 1, 'Example note', player);
  await expect(asUser(db, player, tx => tx.query('select id from public.ko_memories')))
    .resolves.toMatchObject({ rows: [] });
  await expect(asUser(db, player, tx => tx.query('delete from public.ko_memories where id=$1 returning id', [uuid(1)])))
    .resolves.toMatchObject({ rows: [] });
  await expect(insert(player, 2, 'different owner', null, captain)).rejects.toThrow(/row-level security/);
  await expect(insert(outsider, 2, 'unrelated player', player)).rejects.toThrow(/row-level security/);
  await expect(insert(player, 2, 'self attachment', player)).rejects.toThrow(/row-level security/);
  await db.query('update public.coach_clients set archived_at=$1 where captain_id=$2', [TEST_NOW, captain]);
  await expect(insert(captain, 2, 'archived player', player)).rejects.toThrow(/row-level security/);
  await expect(insert(captain, 2, 'eXAMPLE NOTE')).rejects.toThrow(/unique/);
  await expect(asUser(db, captain, tx => tx.query('select id from public.ko_memories')))
    .resolves.toMatchObject({ rows: [{ id: uuid(1) }] });
});

it('keeps the newest 30 rows', async () => {
  await asUser(db, player, tx => tx.query(`
    insert into public.ko_memories (id, kind, text)
    select ('00000000-0000-7000-8000-' || lpad(n::text, 12, '0'))::uuid, 'note', 'note ' || n
    from generate_series(100, 131) n
  `));
  const { rows } = await asUser(db, player, tx => tx.query('select id from public.ko_memories order by id'));
  expect(rows).toHaveLength(30);
  expect(rows[0]).toEqual({ id: uuid(102) });
});

it('keeps learning settings private and blocks new memories while disabled', async () => {
  await asUser(db, player, tx => tx.query('insert into public.ko_memory_settings (learning) values (false)'));
  await expect(asUser(db, captain, tx => tx.query('select * from public.ko_memory_settings')))
    .resolves.toMatchObject({ rows: [] });
  await expect(asUser(db, captain, tx => tx.query('update public.ko_memory_settings set learning=true returning user_id')))
    .resolves.toMatchObject({ rows: [] });
  await expect(insert(player, 200, 'disabled')).rejects.toThrow(/row-level security/);
  await asUser(db, player, tx => tx.query('update public.ko_memory_settings set learning=true'));
  await expect(insert(player, 200, 'enabled')).resolves.toBeDefined();
});

const submit = (actor: string, id = uuid(500)) => asUser(db, actor, tx => tx.query(
  "select public.ko_feedback_submit($1, false, 'wrong', 'answer', array['me','memory','progress'], 'question', 'answer') as accepted",
  [id],
));

it('keeps feedback private, anonymous and limited to 60 daily submissions', async () => {
  await db.query(`insert into security_private.ko_feedback (id, created_at, role, helpful, intent, sources, question, answer)
    values ($2, $1::timestamptz - interval '91 days', 'player', false, 'answer', '{}', 'old', 'old')`, [TEST_NOW, uuid(499)]);
  await expect(submit(captain)).resolves.toMatchObject({ rows: [{ accepted: true }] });
  await expect(submit(captain)).resolves.toMatchObject({ rows: [{ accepted: true }] });
  await expect(asUser(db, captain, tx => tx.query('select * from security_private.ko_feedback')))
    .rejects.toThrow(/permission denied/);
  const { rows } = await db.query<{ feedback: Record<string, unknown> }>(
    'select to_jsonb(f) as feedback from security_private.ko_feedback f',
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]?.feedback).toMatchObject({ role: 'captain', sources: ['progress'], question: 'question' });
  expect(rows[0]?.feedback).not.toHaveProperty('user_id');
  await db.query('update security_private.ko_feedback_hits set hits=59 where user_id=$1', [captain]);
  await expect(submit(captain, uuid(501))).resolves.toMatchObject({ rows: [{ accepted: true }] });
  await expect(submit(captain, uuid(502))).resolves.toMatchObject({ rows: [{ accepted: false }] });
});

it('blocks suspended callers from writing', async () => {
  await db.query('update public.profiles set suspended_at=$1 where id=$2', [TEST_NOW, outsider]);
  await expect(insert(outsider, 20, 'suspended')).rejects.toThrow(/row-level security/);
  await expect(submit(outsider)).rejects.toThrow(/suspend/i);
});
