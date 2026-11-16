import Link from 'next/link';
import type { ReactNode } from 'react';
import { Coins } from 'lucide-react';
import type { Translator } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
// eslint-disable-next-line no-restricted-imports -- Shared presentation must not depend on a server entry, even for its wire type.
import type { MoneyOwed, MoneyOwedRow } from '@/features/billing/data/money-owed-model';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import type { messages } from './messages';
import { buttonClass } from '@/ui/button';

export function MoneyOwedView({ data, mode, playerId, locale, t, onSelect, rowAction }: {
  data: MoneyOwed; mode: 'home' | 'billing' | 'player'; playerId?: string;
  locale: Locale; t: Translator<typeof messages>; onSelect?: (href: string) => void;
  rowAction?: (playerId: string) => ReactNode;
}) {
  const number = (value: number) => formatNumber(value, locale);
  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'short', year: 'numeric' }, locale);
  const description = (row: MoneyOwedRow) => row.reason === 'soon'
    ? t(row.days === 0 ? 'today' : row.days === 1 ? 'tomorrow' : 'soon', { n: number(row.days) })
    : t(row.reason, { n: number(row.days), date: date(row.since) });
  const summary = <Link prefetch={onSelect ? false : undefined} href={onSelect ? '#/captain/billing' : '/captain/billing'} onClick={onSelect ? event => { event.preventDefault(); onSelect('/captain/billing'); } : undefined} className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center gap-stack p-card text-start" })}>
    <Coins aria-hidden className="size-10 shrink-0 text-warn" />
    <div><b className="block font-display text-2xl font-extrabold tabular-nums">{number(data.total)}</b>
      <small className="text-muted">{t('total', { n: number(data.count) })}</small>
      {data.unpriced > 0 && <small className="block text-warn">{t('unknown', { n: number(data.unpriced) })}</small>}
    </div>
  </Link>;
  if (mode === 'home') return summary;
  const rows = mode === 'player' ? data.rows.filter(row => row.playerId === playerId) : data.rows;
  return <section className="space-y-stack" aria-label={t('title')}>
    {mode === 'billing' && <><h2 className="text-lg font-bold">{t('title')}</h2>{summary}</>}
    {data.count === 0 && mode === 'billing' && <p className="text-sm text-muted">{t('empty')}</p>}
    {rows.length === 0 && mode === 'player' && <p className="glass rounded-card p-card text-sm text-muted">{t('empty')}</p>}
    {rows.length > 0 && <ul className="glass divide-y divide-line rounded-card">{rows.map(row => {
      const waiting = row.reason === 'receipt_pending' || row.reason === 'renewal_pending';
      const tone = waiting ? 'bg-calm/10 text-calm' : row.reason === 'soon' ? 'bg-surface text-muted' : 'bg-warn-soft text-warn';
      return <li key={row.playerId} className="flex flex-wrap items-center gap-stack p-card">
        {mode === 'billing' && <span aria-hidden className="glass grid size-10 shrink-0 place-items-center rounded-full font-bold">{row.name.slice(0, 1)}</span>}
        <div className="min-w-0 basis-[calc(100%-4rem)] min-[760px]:basis-0 flex-1">
          {mode === 'billing' && <Link prefetch={onSelect ? false : undefined} href={onSelect ? `#${`/captain/players/${row.playerId}`}` : `/captain/players/${row.playerId}`} onClick={onSelect ? event => { event.preventDefault(); onSelect(`/captain/players/${row.playerId}`); } : undefined} className="flex min-h-12 items-center font-bold">{row.name}</Link>}
          <p className="text-sm text-muted">{description(row)}</p>
          {waiting && <p className="text-xs text-muted">{t('since', { date: date(row.since) })}</p>}
        </div>
        <b className="font-display text-sm tabular-nums">{row.amount === null ? t('unpriced') : t('currency', { amount: number(row.amount) })}</b>
        <span className={`rounded-full px-stack py-inline text-xs ${tone}`}>{t(waiting ? 'waiting' : row.reason === 'soon' ? 'upcoming' : 'late')}</span>
        {rowAction && <span className="flex min-h-12 w-full shrink-0 items-center min-[760px]:w-auto">{rowAction(row.playerId)}</span>}
      </li>;
    })}</ul>}
  </section>;
}
