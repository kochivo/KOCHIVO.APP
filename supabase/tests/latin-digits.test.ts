import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createTestDb } from './harness';

let db: PGlite;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await db?.close(); });

it('starter templates use Latin digits after migration 0034', async () => {
  const rows = (await db.query<{ key: string; payload: unknown }>(
    'select key, payload from security_private.starter_templates')).rows;
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) expect(JSON.stringify(row.payload), row.key).not.toMatch(/[٠-٩]/);
  const notes = rows.map(row => JSON.stringify(row.payload)).join(' ');
  expect(notes).toContain('3 أيام');
});
