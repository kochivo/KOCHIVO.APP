import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { handleAuthCallback } from '../../src/features/auth/data/callback';
import { beforeSend } from '../../src/lib/sentry-scrub';
import { asUser, createTestDb, createUser } from './harness';

const callback = vi.hoisted(() => ({
  cookie: { get: vi.fn(), delete: vi.fn() },
  exchange: vi.fn(), profile: vi.fn(), rpc: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => callback.cookie }));
vi.mock('../../src/features/auth/data/auth-client', () => ({
  authClient: async () => ({ auth: { exchangeCodeForSession: callback.exchange }, rpc: callback.rpc }),
  profile: callback.profile,
  siteOrigin: async () => 'https://kochivo.site',
}));

describe('Pass 2 callback destinations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    callback.exchange.mockResolvedValue({ error: null });
    callback.profile.mockResolvedValue({ role: 'captain', roleConfirmed: true });
    callback.rpc.mockResolvedValue({ error: null });
  });

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', '/captain'])
  ('ignores an untrusted next=%s and keeps the fixed relative captain destination', async next => {
    const url = new URL('https://kochivo.site/auth/callback?code=authorization-code');
    url.searchParams.set('next', next);
    const response = await handleAuthCallback(new NextRequest(url));
    expect(response.headers.get('location')).toBe('https://kochivo.site/captain');
    expect(callback.cookie.delete).toHaveBeenCalledWith('auth-intent');
  });

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com'])
  ('rejects %s as an invite-cookie path on both success and error', async code => {
    callback.cookie.get.mockReturnValue({ value: JSON.stringify({ intent: 'captain', code }) });
    const request = new NextRequest('https://kochivo.site/auth/callback?code=authorization-code');
    expect((await handleAuthCallback(request)).headers.get('location')).toBe('https://kochivo.site/captain');
    callback.exchange.mockRejectedValueOnce(new Error('Exchange failed'));
    const location = (await handleAuthCallback(request)).headers.get('location');
    expect(location && new URL(location).origin).toBe('https://kochivo.site');
    expect(location && new URL(location).pathname).toBe('/login');
    expect(callback.rpc).not.toHaveBeenCalled();
  });
});

describe('Pass 2 database boundaries', () => {
  let db: PGlite;
  beforeAll(async () => { db = await createTestDb(); });
  afterAll(async () => { await db?.close(); });

  it('keeps anonymous API execution limited to invite_preview and the public coach page', async () => {
    const result = await db.query<{ name: string }>(`
      select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
      order by p.proname`);
    expect(result.rows).toEqual([{ name: 'coach_public_profile' }, { name: 'invite_preview' }]);
  });

  it('keeps all public definers on an empty search path and sync RPCs as invokers', async () => {
    expect((await db.query(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
      and not coalesce(p.proconfig @> array['search_path=""'], false)`)).rows).toEqual([]);
    const sync = await db.query<{ proname: string; prosecdef: boolean }>(`
      select proname, prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and proname in ('sync_workout_sessions', 'sync_set_logs', 'sync_meal_logs')`);
    expect(sync.rows).toHaveLength(3);
    expect(sync.rows.every(row => !row.prosecdef)).toBe(true);
  });

  it('retains the cryptographic 9-byte invite default (12 base64url characters, 72 bits)', async () => {
    const result = await db.query<{ expression: string }>(`
      select pg_get_expr(d.adbin, d.adrelid) as expression from pg_attrdef d
      join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
      where d.adrelid = 'public.coach_invites'::regclass and a.attname = 'code'`);
    expect(result.rows[0]?.expression).toContain('extensions.gen_random_bytes(9)');
    expect(result.rows[0]?.expression).toContain("'base64'");
    expect(result.rows[0]?.expression).toContain("'-_'");
  });

  it('denies admin history to ordinary authenticated and anonymous accounts', async () => {
    const user = await createUser(db, 'player');
    await expect(asUser(db, user, tx => tx.query('select public.admin_captains()')))
      .rejects.toMatchObject({ code: '42501' });
    await expect(asUser(db, user, tx => tx.query('select public.admin_captains()'), true))
      .rejects.toMatchObject({ code: '42501' });
  });
});

describe('SEC2-02: invite credentials in telemetry', () => {
  it('redacts invitation path credentials before Sentry receives an event', () => {
    const code = 'AbCdEfGh1234';
    const event = beforeSend({ request: { url: `https://kochivo.site/i/${code}` },
      exception: { values: [{ type: 'Error', value: `Failed route /i/${code}` }] },
      breadcrumbs: [{ category: 'navigation', data: { to: `/i/${code}` } }] });
    expect(JSON.stringify(event)).not.toContain(code);
  });
});
