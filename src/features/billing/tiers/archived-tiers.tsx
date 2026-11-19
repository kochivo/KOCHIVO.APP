'use client';
import { ChevronDown } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatTimestampAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { messages } from './messages';
import type { ArchivedTier } from './types';

export function ArchivedTiers({ tiers, busy, onRestore, onDelete }: {
  tiers: ArchivedTier[]; busy: boolean; onRestore: (id: string) => void; onDelete: (tier: ArchivedTier) => void;
}) {
  const t = useT(messages), locale = useLocale();
  return <details open className="group glass rounded-card">
    <summary className="press flex min-h-14 cursor-pointer list-none items-center gap-inline rounded-card px-card text-sm font-bold focus-visible:ring-2 focus-visible:ring-lime [&::-webkit-details-marker]:hidden">
      <span className="me-auto">{t('archivedTiers')}</span>
      <span className="font-display text-muted tabular-nums">{formatNumber(tiers.length, locale)}</span>
      <ChevronDown aria-hidden className="size-4 text-muted group-open:rotate-180" />
    </summary>
    {tiers.length ? <ul>{tiers.map(tier => <li key={tier.id}
      className="flex min-h-16 flex-wrap items-center gap-stack border-t border-line-soft px-card py-inline">
      <div className="me-auto">
        <p className="break-words text-sm font-bold text-muted">{tier.name}</p>
        <p className="text-xs text-muted">{t('archivedTierDetails', {
          date: formatTimestampAr(tier.archived_at, { day: 'numeric', month: 'short', year: 'numeric' }, locale),
          current: t('archivedTierSubscribers', { n: tier.current, count: formatNumber(tier.current, locale) }),
          past: t('archivedTierSubscribers', { n: tier.past, count: formatNumber(tier.past, locale) }),
        })}</p>
      </div>
      <Button variant="secondary" block={false} disabled={busy} onClick={() => onRestore(tier.id)}>{t('restoreTier')}</Button>
      {tier.canDelete && <Button variant="secondary" block={false} className="border-danger/40! text-danger" disabled={busy}
        onClick={() => onDelete(tier)}>{t('deleteTier')}</Button>}
    </li>)}</ul> : <p className="border-t border-line-soft p-card text-sm text-muted">{t('noArchivedTiers')}</p>}
  </details>;
}
