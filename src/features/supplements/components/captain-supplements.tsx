'use client';
import { IconButton } from '@/ui/icon-button';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';
import { useTimezone } from '@/core/timezone/client';

import { useCallback, useState } from 'react';
import { useResource } from '@/core/resource';
import { localDate } from '@/lib/dates';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useT } from '@/core/i18n';
import type { SupplementRow } from '@/core/offline/tables';
import { messages } from '../messages';
import { supplementAdherence } from '../model';
import { archiveSupplement, reorderSupplements, saveSupplement } from '../data/captain';
import { loadSupplements } from '../data/load-supplements';
import type { SupplementDraft } from '../data/captain';

const SupplementEditor = dynamic(() => import('./supplement-editor').then(module => module.SupplementEditor), {
  ssr: false, loading: () => <div aria-hidden className="glass min-h-24 animate-pulse rounded-card motion-reduce:animate-none" />,
});

export function CaptainSupplements({ playerId }: { playerId: string }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const today = localDate(new Date(), timezone);
  const load = useCallback((signal: AbortSignal) => loadSupplements(playerId, signal), [playerId]);
  const { data, status, retry: refresh } = useResource(`supplements:${playerId}:${today}`, load);
  const [saveError, setError] = useState(false);
  const error = saveError || status === 'error';
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SupplementRow | null | undefined>();
  const now = data?.now ?? 0;
  const mutate = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(false);
    try { await work(); await refresh(); }
    catch { setError(true); }
    finally { setBusy(false); }
  };
  const save = async (draft: SupplementDraft) => {
    await saveSupplement(playerId, draft, editing ?? null, data?.rows.length ?? 0, Date.now());
    setEditing(undefined);
    await refresh();
  };
  return <section className="glass space-y-4 rounded-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{t('title')}</h2>
      <button className="glass min-h-12 rounded-control px-4 font-bold" disabled={busy} onClick={() => setEditing(null)}>{t('add')}</button></div>
    {error && <div role="alert"><p>{t('error')}</p>{captainWorkspaceEnabled() ? <Button variant="secondary" className="min-h-12 px-4" onClick={() => { setError(false); void refresh(); }}>{t('retry')}</Button> : <button className="min-h-12 px-4" onClick={() => { setError(false); void refresh(); }}>{t('retry')}</button>}</div>}
    {!data && !error && <p role="status">{t('loading')}</p>}
    {data && !data.rows.length && <p className="text-muted">{t('empty')}</p>}
    {data && data.rows.length > 0 && <p className="glass-strong rounded-control p-3 font-bold">{t('score', { percent: Math.round(supplementAdherence(data.logs, data.rows, 7, now, data.timezone) * 100) })}</p>}
    {data?.rows.map((row, index) => <article key={row.id} className="glass space-y-3 rounded-card p-4">
      <div className="flex flex-wrap items-center gap-3"><h3 className="font-bold">{row.name}</h3><span>{row.dose}</span><span className="glass rounded-full px-3 py-1 text-sm">{t(row.timing)}</span></div>
      {row.notes && <p className="text-sm text-muted">{row.notes}</p>}
      <p className="text-sm">{t('adherence', { count: Math.round(supplementAdherence(data.logs, [row], 7, now, data.timezone) * 7) })}</p>
      <div className="flex flex-wrap gap-2">
        {captainWorkspaceEnabled() ? <Button variant="secondary" className="min-h-12 px-3" disabled={busy} onClick={() => setEditing(row)}>{t('edit')}</Button> : <button className="min-h-12 px-3" disabled={busy} onClick={() => setEditing(row)}>{t('edit')}</button>}
        {captainWorkspaceEnabled() ? <Button variant="secondary" className="min-h-12 border border-danger/40 px-3 text-danger!" disabled={busy} onClick={() => void mutate(() => archiveSupplement(row.id, Date.now()))}>{t('archive')}</Button> : <button className="min-h-12 px-3" disabled={busy} onClick={() => void mutate(() => archiveSupplement(row.id, Date.now()))}>{t('archive')}</button>}
        {captainWorkspaceEnabled() ? <IconButton className="grid min-h-12 min-w-12 place-items-center" aria-label={t('up')} disabled={busy || index === 0} onClick={() => void mutate(() => reorderSupplements(data.rows, index, -1))}><ArrowUp aria-hidden className="size-5" /></IconButton> : <button className="grid min-h-12 min-w-12 place-items-center" aria-label={t('up')} disabled={busy || index === 0} onClick={() => void mutate(() => reorderSupplements(data.rows, index, -1))}><ArrowUp aria-hidden className="size-5" /></button>}
        {captainWorkspaceEnabled() ? <IconButton className="grid min-h-12 min-w-12 place-items-center" aria-label={t('down')} disabled={busy || index === data.rows.length - 1} onClick={() => void mutate(() => reorderSupplements(data.rows, index, 1))}><ArrowDown aria-hidden className="size-5" /></IconButton> : <button className="grid min-h-12 min-w-12 place-items-center" aria-label={t('down')} disabled={busy || index === data.rows.length - 1} onClick={() => void mutate(() => reorderSupplements(data.rows, index, 1))}><ArrowDown aria-hidden className="size-5" /></button>}
      </div>
    </article>)}
    {editing !== undefined && <SupplementEditor key={editing?.id ?? 'new'} initial={editing} onSave={save} onClose={() => setEditing(undefined)} />}
  </section>;
}
