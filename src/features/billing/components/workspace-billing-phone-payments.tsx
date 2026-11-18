import type { ReactNode } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { clickableClass } from '@/ui/button';
import { workspaceMessages } from '../messages';
import { messages as paymentMessages } from '../payments/messages';
import { messages } from '../phone/messages';
import { paymentMatches } from './workspace-billing-summary';
import type { PaymentFilter, PaymentRow } from './workspace-billing-summary';
import { WorkspaceBillingPhonePlayer } from './workspace-billing-phone-player';

const filters = ['all', 'overdue', 'ending', 'paid'] as const;

export function WorkspaceBillingPhonePayments({ rows, filtered, filter, today, search, summary, onFilter, onOpen }: {
  rows: PaymentRow[]; filtered: PaymentRow[]; filter: PaymentFilter; today: string; search: ReactNode; summary?: ReactNode;
  onFilter: (value: PaymentFilter) => void; onOpen: (row: PaymentRow) => void;
}) {
  const t = useT(messages), workspace = useT(workspaceMessages), payment = useT(paymentMessages), locale = useLocale();
  const chip = `${clickableClass} flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-inline whitespace-nowrap rounded-control bg-ink/5 px-inline text-xs text-muted aria-pressed:bg-ink/10 aria-pressed:font-bold aria-pressed:text-ink`;
  const count = (value: PaymentFilter) => formatNumber(rows.filter(row => paymentMatches(row, value)).length, locale);
  return <div className="min-w-0 space-y-card-gap md:hidden">
    <div role="group" aria-label={workspace('status')} className="flex max-w-full gap-inline overflow-x-auto">
      {filters.map(value => <button key={value} type="button" aria-pressed={filter === value} className={chip}
        onClick={() => onFilter(value)}>{t(value)} <bdi>{count(value)}</bdi></button>)}
    </div>
    {search}
    <div className="glass overflow-hidden rounded-card">
      {filtered.length ? <ul aria-label={workspace('title')}>{filtered.map(row =>
        <WorkspaceBillingPhonePlayer key={row.player.playerId} row={row} today={today} onOpen={() => onOpen(row)} />)}
      </ul> : <p className="p-card text-sm text-muted">{payment('noMatches')}</p>}
    </div>
    <details className="glass rounded-card px-card">
      <summary className="min-h-12 cursor-pointer content-center text-row text-muted focus-visible:ring-2 focus-visible:ring-lime">
        {t('details')}
      </summary>
      <div className="flex flex-wrap items-center gap-stack pb-card">
        <button type="button" aria-pressed={filter === 'noPackage'} onClick={() => onFilter(filter === 'noPackage' ? 'all' : 'noPackage')}
          className={chip}>{workspace('noPackage')} <bdi>{count('noPackage')}</bdi></button>
        {summary}
      </div>
    </details>
  </div>;
}
