'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { formatTimestampAr } from '@/lib/dates';
import { Button } from '@/ui/button';
import { reviewCaptain } from '../data/captain-reviews';
import { messages } from '../approvals/messages';
import type { Json } from '@/types/database';
import { CaptainIntakeDetails } from './captain-intake-details';

export type PendingCaptain = { id: string; email: string | null; full_name: string; created_at: string;
  whatsapp?: string | null; instagram?: string | null; captain_intake?: Json | null };
export function CaptainRequests({ rows, error: loadError, primaryAction = true }: { rows: PendingCaptain[]; error: string | null; primaryAction?: boolean }) {
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
  return <section aria-labelledby="captain-requests-title" className="glass space-y-card-gap rounded-card p-card" aria-busy={pending}>
    <header className="flex flex-wrap items-center gap-stack">
      <h2 id="captain-requests-title" className="text-title font-semibold">{t('title')}</h2>
      <span className={`num rounded-full px-stack py-inline text-sm ${visible.length ? 'bg-lime-soft text-lime' : 'bg-surface text-muted'}`} aria-label={t('count', { n: formatNumber(visible.length, locale) }, visible.length)}>
        {formatNumber(visible.length, locale)}
      </span>
    </header>
    {pending && <p role="status" className="text-muted">{t('loading')}</p>}
    {(error || loadError) && <div role="alert" className="text-danger"><p>{error || loadError}</p>
      <Button variant="secondary" disabled={pending} onClick={() => start(() => router.refresh())}>{t('retry')}</Button>
    </div>}
    {!loadError && (visible.length ? <ul className="space-y-stack">{visible.map((row, index) => <li key={row.id} className="space-y-stack rounded-control border border-line p-stack">
      <div className="flex flex-wrap items-center justify-between gap-stack">
        <div className="min-w-0"><p className="break-words font-bold">{row.full_name}</p>
          <p className="break-all text-sm text-muted">{row.email ?? t('noEmail')}</p>
          <time dateTime={row.created_at} className="text-sm text-muted">
            {formatTimestampAr(row.created_at, { year: 'numeric', month: 'long', day: 'numeric' }, locale)}
          </time>
        </div>
        <div className="flex gap-inline">
          <Button variant={primaryAction && index === 0 ? 'primary' : 'secondary'} className="min-h-12" aria-label={t('approveName', { name: row.full_name })} disabled={pending}
            onClick={() => review(row, 'approved')}>{t('approve')}</Button>
          <Button variant="danger" className="min-h-12" aria-label={t('rejectName', { name: row.full_name })} disabled={pending}
            onClick={() => setRejecting(row.id)}>{t('reject')}</Button>
        </div>
      </div>
      <CaptainIntakeDetails whatsapp={row.whatsapp} instagram={row.instagram} intake={row.captain_intake} />
      {rejecting === row.id && <div role="group" aria-label={t('confirm', { name: row.full_name })} className="space-y-stack">
        <p>{t('confirm', { name: row.full_name })}</p>
        <Button variant="danger" disabled={pending} onClick={() => review(row, 'rejected')}>{t('reject')}</Button>
        <Button variant="secondary" disabled={pending} onClick={() => setRejecting(null)}>{t('cancel')}</Button>
      </div>}
    </li>)}</ul> : <p className="py-stack text-muted">{t('empty')}</p>)}
  </section>;
}
