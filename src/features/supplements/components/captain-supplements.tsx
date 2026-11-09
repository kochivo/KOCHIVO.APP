'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useT } from '@/core/i18n';
import type { SupplementRow } from '@/core/offline/tables';
import { messages } from '../messages';
import { supplementAdherence } from '../model';
import { archiveSupplement, fetchCaptainSupplements, reorderSupplements, saveSupplement } from '../data/captain';
import type { SupplementDraft } from '../data/captain';

const SupplementEditor = dynamic(() => import('./supplement-editor').then(module => module.SupplementEditor), {
  ssr: false, loading: () => <div aria-hidden className="glass min-h-24 animate-pulse rounded-card motion-reduce:animate-none" />,
});

export function CaptainSupplements({ playerId }: { playerId: string }) {
  const t = useT(messages);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCaptainSupplements>>>();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<SupplementRow | null | undefined>();
  const [now, setNow] = useState(0);
  const refresh = useCallback(() => fetchCaptainSupplements(playerId)
    .then(result => { setData(result); setNow(Date.now()); setError(false); })
    .catch(() => setError(true)), [playerId]);
  useEffect(() => { void refresh(); }, [refresh]);
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
    {error && <div role="alert"><p>{t('error')}</p><button className="min-h-12 px-4" onClick={() => void refresh()}>{t('retry')}</button></div>}
    {!data && !error && <p role="status">{t('loading')}</p>}
    {data && !data.rows.length && <p className="text-muted">{t('empty')}</p>}
    {data && data.rows.length > 0 && <p className="glass-strong rounded-control p-3 font-bold">{t('score', { percent: Math.round(supplementAdherence(data.logs, data.rows, 7, now) * 100) })}</p>}
    {data?.rows.map((row, index) => <article key={row.id} className="glass space-y-3 rounded-card p-4">
      <div className="flex flex-wrap items-center gap-3"><h3 className="font-bold">{row.name}</h3><span>{row.dose}</span><span className="glass rounded-full px-3 py-1 text-sm">{t(row.timing)}</span></div>
      {row.notes && <p className="text-sm text-muted">{row.notes}</p>}
      <p className="text-sm">{t('adherence', { count: Math.round(supplementAdherence(data.logs, [row], 7, now) * 7) })}</p>
      <div className="flex flex-wrap gap-2">
        <button className="min-h-12 px-3" disabled={busy} onClick={() => setEditing(row)}>{t('edit')}</button>
        <button className="min-h-12 px-3" disabled={busy} onClick={() => void mutate(() => archiveSupplement(row.id, Date.now()))}>{t('archive')}</button>
        <button className="grid min-h-12 min-w-12 place-items-center" aria-label={t('up')} disabled={busy || index === 0} onClick={() => void mutate(() => reorderSupplements(data.rows, index, -1))}><ArrowUp aria-hidden className="size-5" /></button>
        <button className="grid min-h-12 min-w-12 place-items-center" aria-label={t('down')} disabled={busy || index === data.rows.length - 1} onClick={() => void mutate(() => reorderSupplements(data.rows, index, 1))}><ArrowDown aria-hidden className="size-5" /></button>
      </div>
    </article>)}
    {editing !== undefined && <SupplementEditor key={editing?.id ?? 'new'} initial={editing} onSave={save} onClose={() => setEditing(undefined)} />}
  </section>;
}
