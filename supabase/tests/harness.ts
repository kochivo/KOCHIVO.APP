import fs from 'node:fs';
import path from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

export const TEST_NOW = '2026-11-03T10:00:00Z';

// Catalog now() also covers empty-search-path functions and column defaults.
// CURRENT_DATE is SQL syntax, so only the in-memory migration SQL is rewritten.
const TEST_CLOCK = `
  set timezone = 'UTC';
  create or replace function pg_catalog.now() returns timestamptz
    language sql stable as $$ select timestamptz '${TEST_NOW}' $$;
  create schema test_clock;
  create function test_clock.today() returns date language sql stable
    as $$ select timestamptz '${TEST_NOW}' at time zone 'UTC' $$;
  grant usage on schema test_clock to public;
`;

/**
 * Embedded Postgres with just enough of Supabase (auth, storage, roles) to run our migrations
 * and test RLS without Docker. Lesson kept from the legacy project (docs/LEGACY-AUDIT.md).
 */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz,
    raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select, insert on storage.objects to authenticated;
  grant usage on schema public to authenticated;
`;

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../migrations');

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(TEST_CLOCK);
  await db.exec(SUPABASE_STUB);
  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await db.exec(sql.replace(/\bcurrent_date\b/gi, 'test_clock.today()'));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  return db;
}

/** Creates an auth user (the trigger creates its profile). Runs as superuser. */
export async function createUser(db: PGlite, role: 'captain' | 'player', name: string = role): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (id, raw_user_meta_data) values (gen_random_uuid(), $1) returning id`,
    [JSON.stringify({ role, full_name: name })],
  );
  const user = rows[0];
  if (!user) throw new Error('Creating an auth user returned no id');
  return user.id;
}

export async function makeAdmin(db: PGlite, userId: string): Promise<void> {
  await db.query('insert into public.admins (user_id) values ($1)', [userId]);
}

/** Runs `fn` as a signed-in user: role `authenticated` and auth.uid() = userId, like PostgREST does. */
export async function asUser<T>(db: PGlite, userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await tx.exec('set local role authenticated');
    return fn(tx);
  });
}

/** UTC date relative to TEST_NOW, shared with the SQL test clock. */
export async function dayOffset(db: PGlite, days: number): Promise<string> {
  const { rows } = await db.query<{ d: string }>(
    `select (($1::timestamptz at time zone 'UTC')::date + $2::int)::text as d`, [TEST_NOW, days],
  );
  const date = rows[0];
  if (!date) throw new Error('Computing a test date offset returned no date');
  return date.d;
}

export async function createCaptainWithPlayer(db: PGlite) {
  const captain = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  const accessUntil = await dayOffset(db, 30);
  // Superuser stands in for redeem_invite: since 0015 captains cannot insert relationships.
  await db.query(
    `insert into public.coach_clients (captain_id, player_id, access_until) values ($1, $2, $3)`,
    [captain, player, accessUntil],
  );
  return { captain, player };
}
