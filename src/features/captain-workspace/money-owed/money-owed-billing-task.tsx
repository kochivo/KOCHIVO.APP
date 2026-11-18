import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import type { Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
import type { MoneyOwed } from '@/features/billing/server';
import type { messages } from './messages';

export function MoneyOwedBillingTask({ data, locale, t }: { data: MoneyOwed; locale: Locale; t: Translator<typeof messages> }) {
  const rows = data.rows.filter(row => row.reason === 'partial' || row.reason === 'expired');
  if (!rows.length) return null;
  const number = (value: number) => formatNumber(value, locale);
  const count = new Set(rows.map(row => row.playerId)).size;
  return <details data-billing-task className="group/task border-t border-line-soft">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-stack rounded-control px-card text-row text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime">
      <span className="flex-1 font-semibold">{t('title')}</span>
      <span className="tabular-nums text-faint">{number(count)}</span>
      <ChevronDown aria-hidden className="size-4 shrink-0 group-open/task:rotate-180" />
    </summary>
    <ul className="px-card pb-stack">{rows.map(row => <li key={`${row.playerId}:${row.reason}`} className="border-t border-line-soft">
      <Link href={`/captain/players/${row.playerId}`} className="flex min-h-12 flex-wrap items-center gap-inline hover:underline">
        <b className="wrap-break-word text-sm">{row.name}</b>
        <span className="flex-1 text-xs text-muted">{row.reason === 'expired'
          ? t('expired', { n: number(row.days) })
          : t('partial', { date: formatDateAr(row.since, { day: 'numeric', month: 'short' }, locale) })}</span>
        {row.amount !== null && row.amount > 0 && <span className="text-xs text-warn">{t('currency', { amount: number(row.amount) })}</span>}
      </Link>
    </li>)}</ul>
  </details>;
}
