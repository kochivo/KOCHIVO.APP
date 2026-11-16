import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('adds only the Sentry vault key and preserves function privileges', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create schema security_private; create schema vault;
      create table vault.decrypted_secrets(name text, decrypted_secret text);
      create function security_private.push_config() returns jsonb language plpgsql stable security definer
        set search_path = '' as $$ begin return null; end $$;
      revoke all on function security_private.push_config() from public;
      insert into vault.decrypted_secrets values ('sentry_dsn','dsn'),('push_hook_secret','hook'),('other','private');`);
    await db.exec(readFileSync('supabase/migrations/0136_push_config_sentry.sql', 'utf8'));
    expect((await db.query('select security_private.push_config() as config')).rows)
      .toEqual([{ config: { sentry_dsn: 'dsn', push_hook_secret: 'hook' } }]);
    expect((await db.query(`select has_function_privilege('authenticated', 'security_private.push_config()', 'execute') as allowed`)).rows)
      .toEqual([{ allowed: false }]);
    await db.exec('drop schema vault cascade');
    expect((await db.query('select security_private.push_config() as config')).rows).toEqual([{ config: null }]);
  } finally { await db.close(); }
});
