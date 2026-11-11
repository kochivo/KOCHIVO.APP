import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { AppDatabase as Database } from '../../src/types/app-database';
import { KochivoDB, setLocalUser } from '../../src/core/offline/db';
import { flushOutbox } from '../../src/core/offline/sync';
import { supabaseTransport } from '../../src/core/offline/transport';
import { logSet } from '../../src/features/workout/data/log-set';
import { setId } from '../../src/features/workout/ids';
import { asUser, createCaptainWithPlayer, createTestDb, TEST_NOW } from './harness';
import { tenantFixture } from './cross-tenant-fixture';

let db: PGlite;
let local: KochivoDB;
let tenant: Awaited<ReturnType<typeof tenantFixture>>;
const now = Date.parse(TEST_NOW);
beforeAll(async () => {
  db = await createTestDb();
  const { captain, player } = await createCaptainWithPlayer(db);
  tenant = await tenantFixture(db, captain, player);
  await setLocalUser(player);
  local = new KochivoDB('rls-set-sync');
});
afterAll(async () => { await setLocalUser(null); await local?.delete(); await db?.close(); });

function transport() {
  // Only the HTTP boundary is replaced: the real Supabase client and transport call real PostgreSQL.
  const client = createClient<Database>('https://offline.invalid', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, options) => {
      expect(String(url)).toBe('https://offline.invalid/rest/v1/rpc/sync_set_logs');
      const body = JSON.parse(String(options?.body)) as { p_rows: unknown };
      await asUser(db, tenant.player, tx => tx.query('select public.sync_set_logs($1)', [JSON.stringify(body.p_rows)]));
      return new Response(null, { status: 204 });
    } },
  });
  vi.spyOn(client.auth, 'getUser').mockResolvedValue({ data: { user: { id: tenant.player, aud: 'authenticated',
    app_metadata: {}, user_metadata: {}, created_at: TEST_NOW } }, error: null });
  return supabaseTransport(client, tenant.player);
}

it('replays a server commit after a lost acknowledgement and reload without duplicate sets', async () => {
  const input = { session_id: tenant.session, program_exercise_id: tenant.item, exercise_id: tenant.exercise,
    set_index: 2, weight_kg: 65, reps: 8 };
  await logSet(local, input, now);
  const send = transport();
  expect(await flushOutbox(local, async (table, rows) => {
    await send(table, rows);
    throw new Error('acknowledgement lost');
  }, now)).toEqual({ sent: 0, failed: 1 });
  const id = await setId(tenant.session, tenant.item, 2);
  expect((await db.query('select weight_kg::float from public.set_logs where id = $1', [id])).rows).toEqual([{ weight_kg: 65 }]);
  local.close();
  local = new KochivoDB('rls-set-sync');
  expect(await local.outbox.count()).toBe(1);
  expect(await flushOutbox(local, send, now + 2000)).toEqual({ sent: 1, failed: 0 });
  expect(await local.outbox.count()).toBe(0);
  expect((await db.query('select count(*)::int as total from public.set_logs where id = $1', [id])).rows).toEqual([{ total: 1 }]);
  await logSet(local, { ...input, reps: 10 }, now + 3000);
  await flushOutbox(local, send, now + 3000);
  await logSet(local, { ...input, reps: 6 }, now + 1000);
  await flushOutbox(local, send, now + 4000);
  expect((await db.query('select reps from public.set_logs where id = $1', [id])).rows).toEqual([{ reps: 10 }]);
});

it('syncs the twentieth set supported by the workout builder', async () => {
  await logSet(local, { session_id: tenant.session, program_exercise_id: tenant.item, exercise_id: tenant.exercise,
    set_index: 20, weight_kg: 60, reps: 8 }, now + 5000);
  expect(await flushOutbox(local, transport(), now + 5000)).toEqual({ sent: 1, failed: 0 });
  expect((await db.query('select reps from public.set_logs where id = $1', [await setId(tenant.session, tenant.item, 20)])).rows)
    .toEqual([{ reps: 8 }]);
});
