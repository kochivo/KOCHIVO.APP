import fs from 'node:fs';
import path from 'node:path';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

/**
 * Embedded Postgres with just enough of Supabase (auth, storage, roles) to run our migrations
 * and test RLS without Docker. Lesson kept from the legacy project (docs/LEGACY-AUDIT.md).
 */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}');
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
  await db.exec(SUPABASE_STUB);
  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
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
  return rows[0]!.id;
}

/** Runs `fn` as a signed-in user: role `authenticated` and auth.uid() = userId, like PostgREST does. */
export async function asUser<T>(db: PGlite, userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await tx.exec('set local role authenticated');
    return fn(tx);
  });
}

/** Date string relative to today, as Postgres sees it (current_date). */
export async function dayOffset(db: PGlite, days: number): Promise<string> {
  const { rows } = await db.query<{ d: string }>(`select (current_date + $1::int)::text as d`, [days]);
  return rows[0]!.d;
}

export async function createCaptainWithPlayer(db: PGlite) {
  const captain = await createUser(db, 'captain');
  const player = await createUser(db, 'player');
  const accessUntil = await dayOffset(db, 30);
  await asUser(db, captain, (tx) => tx.query(
    `insert into public.coach_clients (captain_id, player_id, access_until) values ($1, $2, $3)`,
    [captain, player, accessUntil],
  ));
  return { captain, player };
}
