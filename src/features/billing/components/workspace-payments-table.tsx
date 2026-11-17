'use client';
import { secondaryButtonClass } from '@/ui/secondary-button-class';
import { RowChevron } from '@/ui/row-chevron';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { formatTimestampAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { LoadingState } from '@/ui/loading-state';
import { PageBarActions } from '@/ui/page-bar-actions';
import { Segmented } from '@/ui/segmented';
import { KoPlus } from '@/ui/icons/ko-plus';
import { messages, workspaceMessages } from '../messages';
import { messages as paymentMessages } from '../payments/messages';
import { messages as financeMessages } from '../workspace/messages';
import type { BillingPlayer, Package } from '../types';
import { messages as methodMessages } from '../methods/messages';
import { Button } from '@/ui/button';
import { currentPayment } from '../current-payment';
import { paymentSegment, segmentCounts } from '../workspace';
import type { PaymentSegment } from '../workspace';

const Detail = dynamic(() => import('./workspace-player-detail').then(module => module.WorkspacePlayerDetail), { loading: () => <LoadingState variant="detail" /> });
const Picker = dynamic(() => import('./payment-player-picker').then(module => module.PaymentPlayerPicker), { loading: () => <LoadingState variant="detail" /> });
export function WorkspacePaymentsTable({ players, packages, today }: { players: BillingPlayer[]; packages: Package[]; today: string }) {
  const t = useT(workspaceMessages), legacy = useT(messages), locale = useLocale(), timezone = useTimezone();
  const payment = useT(paymentMessages), finance = useT(financeMessages), methodT = useT(methodMessages);
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<'history' | 'activate' | 'collect' | 'renew'>('history');
  const [filter, setFilter] = useState<PaymentSegment>('all');
  const selected = players.find(player => player.playerId === selectedId);
  const counts = segmentCounts(players, today);
  const paid = [...players].sort((a, b) => (b.lastPayment?.created_at ?? '').localeCompare(a.lastPayment?.created_at ?? ''))
    .filter(player => filter === 'all' || paymentSegment(player, today) === filter);
  const option = (value: PaymentSegment) => ({ value, label: `${payment(value)} ${formatNumber(counts[value], locale)}` });
  const options = [option('all'), option('overdue'), option('ending'), option('paid')] as const;
  return <section className="glass min-w-0 overflow-hidden rounded-card">
    {players.length > 0 && <PageBarActions><Button variant="secondary" onClick={() => setPicking(true)} block={false}>
      <KoPlus aria-hidden className="size-5" />{payment('record')}</Button></PageBarActions>}
    <header className="flex flex-wrap items-center gap-stack px-card pt-card pb-stack">
      <h2 className="text-md font-bold">{t('all')}</h2>
      <Segmented aria-label={t('status')} options={options} value={filter}
        onChange={value => setFilter(value as PaymentSegment)} className="w-full min-w-0 min-[1100px]:ms-auto min-[1100px]:w-auto" />
    </header>
    {paid.length ? <table className="block w-full text-start text-row min-[1100px]:table">
      <caption className="block px-card pb-stack text-start text-xs text-muted min-[1100px]:table-caption">{t('latest')}</caption>
      <thead className="sr-only min-[1100px]:not-sr-only min-[1100px]:table-header-group"><tr className="text-xs text-muted">
        {[t('player'), legacy('packagePrice'), t('amount'), t('status'), methodT('method'), t('date'), finance('actions')].map(label =>
          <th key={label} className="px-card py-stack text-start font-normal">{label}</th>)}
      </tr></thead>
      <tbody className="block min-[1100px]:table-row-group">{paid.map(player => {
        const summary = currentPayment(player.lastPayment), segment = paymentSegment(player, today);
        const chosen = packages.find(item => item.id === player.lastPayment?.package_id);
        const price = player.lastPayment?.price_egp ?? chosen?.price_egp;
        const tone = segment === 'overdue' ? 'tone-danger' : segment === 'ending' ? 'tone-warn'
          : player.frozenAt || player.pending ? 'tone-neutral' : player.awaitingPlansAt ? 'tone-info'
            : summary.status === 'partial' || summary.status === 'unpaid' ? 'tone-warn' : summary.paid > 0 ? 'tone-lime' : 'tone-neutral';
        return <tr key={player.playerId} className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-inline border-t border-line-soft px-card py-inline min-[1100px]:table-row">
          <td className="min-w-0 min-[1100px]:px-card min-[1100px]:py-inline">
            <button onClick={() => { setAction('history'); setSelectedId(player.playerId); }} className={`${secondaryButtonClass} min-h-12 max-w-full text-start`}>
              <span className="min-w-0"><b className="block break-words">{player.fullName}</b>
                <small className="block break-words text-xs text-muted">{chosen?.name ?? (player.lastPayment ? legacy('days', { n: player.lastPayment.days, count: formatNumber(player.lastPayment.days, locale) }) : legacy('noPayments'))}</small>
              </span><RowChevron /></button>
            <small className="block text-xs text-muted min-[1100px]:hidden">{methodT(summary.method)}</small>
          </td>
          <td className="hidden px-card py-inline font-display tabular-nums min-[1100px]:table-cell">{price != null ? formatNumber(price, locale) : legacy('noAmount')}</td>
          <td className="font-display tabular-nums min-[1100px]:px-card min-[1100px]:py-inline">{summary.paid > 0 ? formatNumber(summary.paid, locale) : legacy('noAmount')}</td>
          <td className="min-w-0 min-[1100px]:px-card min-[1100px]:py-inline">
            <span className={`inline-flex rounded-md px-inline text-micro font-semibold ${tone}`}>{t(summary.status)}</span>
            {segment === 'ending' && <small className="block text-xs text-warn">{payment('ending')}</small>}
          </td>
          <td className="hidden px-card py-inline text-muted min-[1100px]:table-cell">{methodT(summary.method)}</td>
          <td className="hidden px-card py-inline text-muted min-[1100px]:table-cell">{player.lastPayment && formatTimestampAr(player.lastPayment.created_at, { day: 'numeric', month: 'long' }, locale, timezone)}</td>
          <td className="min-[1100px]:px-card min-[1100px]:py-inline">
            {!player.lastPayment ? <Button variant="secondary" block={false} onClick={() => { setAction(player.pending ? 'activate' : 'renew'); setSelectedId(player.playerId); }}>{payment('record')}</Button>
              : <Button variant="secondary" block={false} onClick={() => { setAction('history'); setSelectedId(player.playerId); }}>{finance('history')}</Button>}
          </td>
        </tr>;
      })}</tbody>
    </table> : <p className="p-card text-sm text-muted">{players.length ? payment('noMatches') : legacy('noPayments')}</p>}
    {selected && <Detail key={`${selected.playerId}:${selected.accessUntil}:${selected.lastPayment?.id}:${selected.due}`} player={selected} packages={packages} today={today} initialAction={action} onClose={() => setSelectedId(null)} />}
    {picking && <Picker players={players} onClose={() => setPicking(false)} onChoose={player => {
      setPicking(false); setAction(player.pending ? 'activate' : player.due > 0 ? 'collect' : 'renew'); setSelectedId(player.playerId);
    }} />}
  </section>;
}
