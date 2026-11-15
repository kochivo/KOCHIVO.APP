import 'server-only';

import { z } from 'zod';
import type { planClient } from './client';

export function missingReplacesColumn(error: { code?: string; message?: string } | null) {
  return Boolean(error && ['42703', 'PGRST204'].includes(error.code ?? '') && /replaces_id/.test(error.message ?? ''));
}

const replacementRows = z.array(z.object({ id: z.string(), replaces_id: z.string().nullable().optional() }));

// RLS restricts owned rows to this captain or the player's captain. Scan independently of
// search/category/page filters so renamed versions still hide their original everywhere.
export async function foodReplacements(client: Awaited<ReturnType<typeof planClient>>) {
  const versions = new Map<string, string>();
  let cursor: string | undefined;
  for (;;) {
    let request = client.from('foods').select('id,replaces_id').is('archived_at', null).order('id').limit(200);
    if (cursor) request = request.gt('id', cursor);
    const { data, error } = await request;
    if (missingReplacesColumn(error)) return { versions, error: null, supported: false };
    if (error) return { versions, error, supported: false };
    const rows = replacementRows.parse(data ?? []);
    for (const row of rows) if (row.replaces_id) versions.set(row.id, row.replaces_id);
    if (rows.length < 200) return { versions, error: null, supported: true };
    cursor = rows.at(-1)?.id;
  }
}
