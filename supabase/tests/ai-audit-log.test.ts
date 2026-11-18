import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { asUser, createTestDb, createUser } from './harness';

let db: PGlite;
let captain: string;
let other: string;
const args = ['ko', 'list_athletes', 'read', 'ok', 10, 'bdf3f250-dc65-4fe6-97ac-b53940f17b08'];
const write = 'select public.ai_audit_write($1,$2,$3,$4,$5,$6)';

beforeAll(async () => {
  db = await createTestDb();
  captain = await createUser(db, 'captain');
  other = await createUser(db, 'player');
});
afterAll(async () => { await db?.close(); });

it('binds audit writes and reads to the authenticated user', async () => {
  await asUser(db, captain, tx => tx.query(write, args));
  const read = 'select user_id, client, tool, kind, status, duration_ms, correlation_id from public.ai_audit_log';
  expect((await asUser(db, captain, tx => tx.query(read))).rows).toEqual([{
    user_id: captain, client: args[0], tool: args[1], kind: args[2], status: args[3],
    duration_ms: args[4], correlation_id: args[5],
  }]);
  expect((await asUser(db, other, tx => tx.query(read))).rows).toEqual([]);
});

it('denies a direct insert', async () => {
  await expect(asUser(db, captain, tx => tx.query(
    'insert into public.ai_audit_log (user_id, client, tool, kind, status, duration_ms, correlation_id) values ($1,$2,$3,$4,$5,$6,$7)',
    [captain, ...args],
  ))).rejects.toMatchObject({ code: '42501' });
});

it.each(['anon', 'authenticated'])('denies %s without a user ID', async role => {
  await expect(db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query(write, args);
  })).rejects.toMatchObject({ code: '42501' });
});

it('denies anonymous sign-ins even with the authenticated database role', async () => {
  await expect(asUser(db, captain, tx => tx.query(write, args), true)).rejects.toMatchObject({ code: '42501' });
});

it('blocks audit reads and writes after suspension', async () => {
  const suspended = await createUser(db, 'player');
  await asUser(db, suspended, tx => tx.query(write, args));
  await db.query('update public.profiles set suspended_at = now() where id = $1', [suspended]);
  expect((await asUser(db, suspended, tx => tx.query('select id from public.ai_audit_log'))).rows).toEqual([]);
  await expect(asUser(db, suspended, tx => tx.query(write, args))).rejects.toMatchObject({ code: '42501' });
});

it.each([[0, 'mcp:bad client'], [1, 'bad tool'], [3, 'bad_status']])('rejects invalid metadata at index %i', async (index, invalid) => {
  const bad = [...args];
  bad[index] = invalid;
  await expect(asUser(db, captain, tx => tx.query(write, bad))).rejects.toMatchObject({ code: '23514' });
});
