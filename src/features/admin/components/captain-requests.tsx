'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { formatTimestampAr } from '@/lib/dates';
import { Button } from '@/ui/button';
import { reviewCaptain } from '../data/captain-reviews';
import { messages } from '../approvals/messages';

export type PendingCaptain = { id: string; email: string | null; full_name: string; created_at: string };
export function CaptainRequests({ rows, error: loadError }: { rows: PendingCaptain[]; error: string | null }) {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const [removed, setRemoved] = useState<string[]>([]);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  const visible = rows.filter(row => !removed.includes(row.id));
  function review(row: PendingCaptain, status: 'approved' | 'rejected') {
    setError(''); setRejecting(null);
    setRemoved(ids => [...ids, row.id]);
    start(async () => {
      try {
        const result = await reviewCaptain({ captain: row.id, status });
        if (result.error) throw new Error(result.error);
        router.refresh();
      } catch {
        setRemoved(ids => ids.filter(id => id !== row.id));
        setError(t('failed'));
      }
    });
  }
  return <section aria-labelledby="captain-requests-title" className="glass space-y-4 rounded-card p-5" aria-busy={pending}>
    <header className="flex flex-wrap items-center gap-3">
      <h2 id="captain-requests-title" className="text-xl font-bold">{t('title')}</h2>
      <span className="rounded-full bg-lime/10 px-3 py-1 text-sm text-lime" aria-label={t('count', { n: formatNumber(visible.length, locale) })}>
        {formatNumber(visible.length, locale)}
      </span>
    </header>
    {pending && <p role="status" className="text-muted">{t('loading')}</p>}
    {(error || loadError) && <div role="alert" className="text-danger"><p>{error || loadError}</p>
      <Button variant="ghost" disabled={pending} onClick={() => start(() => router.refresh())}>{t('retry')}</Button>
    </div>}
    {!loadError && (visible.length ? <ul className="divide-y divide-line">{visible.map(row => <li key={row.id} className="space-y-3 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><p className="break-words font-bold">{row.full_name}</p>
          <p className="break-all text-sm text-muted">{row.email ?? t('noEmail')}</p>
          <time dateTime={row.created_at} className="text-sm text-muted">
            {formatTimestampAr(row.created_at, { year: 'numeric', month: 'long', day: 'numeric' }, locale)}
          </time>
        </div>
        <div className="flex gap-2">
          <Button className="min-h-12" aria-label={t('approveName', { name: row.full_name })} disabled={pending}
            onClick={() => review(row, 'approved')}>{t('approve')}</Button>
          <Button variant="danger" className="min-h-12" aria-label={t('rejectName', { name: row.full_name })} disabled={pending}
            onClick={() => setRejecting(row.id)}>{t('reject')}</Button>
        </div>
      </div>
      {rejecting === row.id && <div role="group" aria-label={t('confirm', { name: row.full_name })} className="space-y-3">
        <p>{t('confirm', { name: row.full_name })}</p>
        <Button variant="danger" disabled={pending} onClick={() => review(row, 'rejected')}>{t('reject')}</Button>
        <Button variant="ghost" disabled={pending} onClick={() => setRejecting(null)}>{t('cancel')}</Button>
      </div>}
    </li>)}</ul> : <p className="py-6 text-muted">{t('empty')}</p>)}
  </section>;
}
