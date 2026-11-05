import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
import type { SupplementRow } from '@/core/offline/tables';
import type { Timing } from '../model';

export type SupplementDraft = { name: string; dose: string; timing: Timing; notes: string };

export async function fetchCaptainSupplements(playerId: string) {
  const client = await loadSupabaseBrowser();
  const [rows, logs] = await Promise.all([
    client.from('supplements').select('*').eq('player_id', playerId).is('archived_at', null).order('position').order('created_at'),
    client.from('supplement_logs').select('*').eq('player_id', playerId),
  ]);
  if (rows.error || logs.error) throw rows.error ?? logs.error;
  return { rows: rows.data, logs: logs.data };
}

export async function saveSupplement(playerId: string, draft: SupplementDraft, existing: SupplementRow | null, position: number, now: number) {
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw error ?? new Error('Unauthenticated');
  const row: SupplementRow = { ...draft, name: draft.name.trim(), id: existing?.id ?? uuidv7(now), player_id: playerId,
    captain_id: data.user.id, position: existing?.position ?? position, archived_at: null,
    created_at: existing?.created_at ?? new Date(now).toISOString() };
  const result = existing ? await client.from('supplements').update({ ...draft, name: row.name }).eq('id', existing.id) : await client.from('supplements').insert(row);
  if (result.error) throw result.error;
}

export async function archiveSupplement(id: string, now: number) {
  const result = await (await loadSupabaseBrowser()).from('supplements').update({ archived_at: new Date(now).toISOString() }).eq('id', id);
  if (result.error) throw result.error;
}

export async function reorderSupplements(rows: SupplementRow[], index: number, direction: number) {
  const target = index + direction;
  if (target < 0 || target >= rows.length) return;
  const ordered = [...rows];
  const item = ordered.splice(index, 1)[0];
  if (!item) return;
  ordered.splice(target, 0, item);
  const client = await loadSupabaseBrowser();
  for (const [position, row] of ordered.entries()) {
    const result = await client.from('supplements').update({ position }).eq('id', row.id);
    if (result.error) throw result.error;
  }
}
