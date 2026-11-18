'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Search } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { LoadingState } from '@/ui/loading-state';
import { editableFieldClass } from '@/ui/edit-in-place';
import { PageBarActions } from '@/ui/page-bar-actions';
import { KoPlus } from '@/ui/icons/ko-plus';
import { Button } from '@/ui/button';
import { messages, workspaceMessages } from '../messages';
import { messages as paymentMessages } from '../payments/messages';
import { messages as financeMessages } from '../workspace/messages';
import type { BillingPlayer, Package } from '../types';
import { paymentFilters, paymentMatches, paymentRows } from './workspace-billing-summary';
import type { PaymentAction, PaymentFilter, PaymentRow } from './workspace-billing-summary';
import { WorkspaceBillingPaymentRow } from './workspace-billing-payment-row';
import { WorkspaceBillingPhonePayments } from './workspace-billing-phone-payments';

const Detail = dynamic(() => import('./workspace-player-detail').then(module => module.WorkspacePlayerDetail), { loading: () => <LoadingState variant="detail" /> });
const Picker = dynamic(() => import('./payment-player-picker').then(module => module.PaymentPlayerPicker), { loading: () => <LoadingState variant="detail" /> });

export function WorkspacePaymentsTable({ players, packages, today, rows = paymentRows(players, packages, today), phone = false, summary }: {
  players: BillingPlayer[]; packages: Package[]; today: string; rows?: PaymentRow[]; phone?: boolean; summary?: ReactNode;
}) {
  const t = useT(workspaceMessages), legacy = useT(messages), locale = useLocale();
  const payment = useT(paymentMessages), finance = useT(financeMessages);
  const [picking, setPicking] = useState(false);
  const [selection, setSelection] = useState<{ id: string; action: PaymentAction } | null>(null);
  const [filter, setFilter] = useState<PaymentFilter>('all');
  const [search, setSearch] = useState('');
  const selected = players.find(player => player.playerId === selection?.id);
  const query = search.trim().toLocaleLowerCase();
  const filtered = rows.filter(row => paymentMatches(row, filter) && row.player.fullName.toLocaleLowerCase().includes(query));
  const labels = { all: t('allPlayers'), overdue: t('overdue'), noPackage: t('noPackage'), ending: t('soon'), paid: t('paid') };
  if (!players.length) return null;
  const open = (row: PaymentRow) => setSelection({ id: row.player.playerId, action: row.action });
  const searchField = <label className="relative w-full sm:w-64">
    <Search aria-hidden className="pointer-events-none absolute start-stack top-1/2 size-4 -translate-y-1/2 text-muted" />
    <input type="search" aria-label={t('search')} placeholder={t('search')} value={search} onChange={event => setSearch(event.target.value)}
      className={`${editableFieldClass} min-h-12 w-full ps-section pe-stack text-sm text-ink placeholder:text-faint`} />
  </label>;

  return <section className="min-w-0 space-y-card-gap">
    {phone && <WorkspaceBillingPhonePayments rows={rows} filtered={filtered} filter={filter} today={today}
      search={searchField} summary={summary} onFilter={setFilter} onOpen={open} onPick={() => setPicking(true)} />}
    <PageBarActions><Button onClick={() => setPicking(true)} block={false} className={phone ? 'max-md:hidden!' : undefined}>
      <KoPlus aria-hidden className="size-5" />{payment('record')}</Button></PageBarActions>
    <header className={`flex flex-wrap items-center justify-between gap-stack${phone ? ' max-md:hidden' : ''}`}>
      <div role="group" aria-label={t('status')} className="glass flex max-w-full gap-inline overflow-x-auto rounded-control p-inline">
        {paymentFilters.map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
          className="press flex min-h-12 shrink-0 cursor-pointer items-center gap-inline whitespace-nowrap rounded-control px-stack text-sm text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime aria-pressed:bg-ink/10 aria-pressed:font-bold aria-pressed:text-ink">
          {labels[value]}<span className="text-micro tabular-nums text-faint">{formatNumber(rows.filter(row => paymentMatches(row, value)).length, locale)}</span>
        </button>)}
      </div>
      {searchField}
    </header>
    <div className={`glass overflow-hidden rounded-card${phone ? ' max-md:hidden' : ''}`}>
      {filtered.length ? <table aria-label={t('title')} className="block w-full text-start text-row min-[1024px]:table min-[1280px]:table-fixed">
        <colgroup className="hidden min-[1280px]:table-column-group">
          <col className="w-[23%]" /><col className="w-[18%]" /><col className="w-[12%]" />
          <col className="w-[15%]" /><col className="w-[17%]" /><col className="w-[15%]" />
        </colgroup>
        <thead className="sr-only min-[1024px]:not-sr-only min-[1024px]:table-header-group"><tr className="text-xs text-faint">
          {[t('player'), t('paidColumn'), t('status'), t('subscription'), legacy('lastPayment'), finance('actions')].map((label, index) =>
            <th key={label} scope="col" className="px-card py-stack text-start font-normal">{index === 5 ? <span className="sr-only">{label}</span> : label}</th>)}
        </tr></thead>
        <tbody className="block min-[1024px]:table-row-group">{filtered.map(row => <WorkspaceBillingPaymentRow key={row.player.playerId}
          row={row} onOpen={() => open(row)} />)}</tbody>
      </table> : <p className="p-card text-sm text-muted">{payment('noMatches')}</p>}
    </div>
    {selected && selection && <Detail key={`${selected.playerId}:${selected.accessUntil}:${selected.lastPayment?.id}:${selected.due}`}
      player={selected} packages={packages} today={today} initialAction={selection.action} onClose={() => setSelection(null)} />}
    {picking && <Picker players={players} onClose={() => setPicking(false)} onChoose={player => {
      setPicking(false);
      setSelection({ id: player.playerId, action: player.frozenAt ? 'history' : player.pending ? 'activate' : player.due > 0 ? 'collect' : 'renew' });
    }} />}
  </section>;
}
