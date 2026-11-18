'use server';

import { currentClaims } from '@/core/supabase/claims';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { rosterClient } from '../data/client';

const countOptions = { count: 'exact', head: true } as const;
type Count = { count: number | null; error: unknown };
const successful = (result: Count) => result.error ? null : result.count;

async function foodCount(client: Awaited<ReturnType<typeof rosterClient>>) {
  const visible = client.from('foods').select('id', countOptions).is('archived_at', null);
  const originals = new Set<string>();
  const size = 500;
  for (let start = 0; ; start += size) {
    const rows = await client.from('foods').select('replaces_id').is('archived_at', null).not('replaces_id', 'is', null)
      .order('id').range(start, start + size - 1).overrideTypes<{ replaces_id: string }[], { merge: false }>();
    // Older catalogs have no replacement column and display every active food.
    if (rows.error) return ['42703', 'PGRST204'].includes(rows.error.code) && rows.error.message.includes('replaces_id')
      ? successful(await visible) : null;
    for (const row of rows.data) originals.add(row.replaces_id);
    if (rows.data.length < size) break;
  }
  return successful(await (originals.size ? visible.not('id', 'in', `(${[...originals].join(',')})`) : visible));
}

export async function loadCaptainMoreCounts() {
  if (!captainWorkspaceEnabled()) return null;
  const auth = await currentClaims();
  const captain = auth.data?.claims.sub;
  if (auth.error || !captain) return null;
  const client = await rosterClient();
  const [programs, exercises, plans, foods, forms] = await Promise.all([
    client.from('programs').select('id', countOptions).eq('captain_id', captain).eq('is_template', true).neq('status', 'archived'),
    client.from('exercises').select('id', countOptions).is('archived_at', null),
    client.from('nutrition_plans').select('id', countOptions).eq('captain_id', captain).eq('is_template', true).neq('status', 'archived'),
    foodCount(client),
    client.from('forms').select('id', countOptions).eq('captain_id', captain).is('archived_at', null),
  ]);
  return { programs: successful(programs), exercises: successful(exercises), plans: successful(plans), foods, forms: successful(forms) };
}
