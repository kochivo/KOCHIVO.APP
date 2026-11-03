import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestDb } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });
it('applies the progress migration idempotently and indexes both player timelines', async () => {
  await db.exec(readFileSync('supabase/migrations/0045_progress_indexes.sql', 'utf8'));
  const { rows } = await db.query<{ tablename: string; indexdef: string }>(
    `select tablename, indexdef from pg_indexes where indexname in ('check_ins_player_created_idx', 'form_checks_player_created_idx') order by tablename`);
  expect(rows.map(row => row.tablename)).toEqual(['check_ins', 'form_checks']);
  for (const row of rows) expect(row.indexdef).toContain('(player_id, created_at DESC)');
});
