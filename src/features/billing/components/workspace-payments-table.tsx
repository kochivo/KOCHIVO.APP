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
import { messages, workspaceMessages } from '../messages';
import { messages as paymentMessages } from '../payments/messages';
import type { BillingPlayer, Package } from '../types';
import { messages as methodMessages } from '../methods/messages';
import { Button } from '@/ui/button';
import { currentPayment } from '../current-payment';

const Detail = dynamic(() => import('./workspace-player-detail').then(module => module.WorkspacePlayerDetail), { loading: () => <LoadingState variant="detail" /> });
const Picker = dynamic(() => import('./payment-player-picker').then(module => module.PaymentPlayerPicker), { loading: () => <LoadingState variant="detail" /> });
export function WorkspacePaymentsTable({ players, packages, today }: { players: BillingPlayer[]; packages: Package[]; today: string }) {
  const t = useT(workspaceMessages), legacy = useT(messages), locale = useLocale(), timezone = useTimezone();
  const payment = useT(paymentMessages);
  const methodT = useT(methodMessages);
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<'history' | 'activate' | 'collect' | 'renew'>('history');
  const selected = players.find(player => player.playerId === selectedId);
  const paid = [...players].sort((a, b) => (b.lastPayment?.created_at ?? '').localeCompare(a.lastPayment?.created_at ?? ''));
  return <section className="glass min-w-0 rounded-card border border-line-soft p-card">
    <header className="mb-stack flex items-center justify-between gap-stack"><h2 className="font-semibold">{t('all')}</h2>
      {players.length > 0 && <Button onClick={() => setPicking(true)} type="submit" variant={'secondary'} block={false} className={"min-h-12 px-page-x text-sm"}>{payment('record')}</Button>}</header>
    {paid.length ? <table className="w-full text-start text-row"><caption className="pb-stack text-start text-xs text-faint">{t('latest')}</caption><thead><tr className="text-xs text-faint">
      <th className="py-stack text-start font-normal">{t('player')}</th><th className="py-stack text-start font-normal">{t('amount')}</th>
      <th className="py-stack text-start font-normal">{methodT('method')}</th>
      <th className="hidden py-stack text-start font-normal min-[761px]:table-cell">{t('date')}</th><th className="py-stack text-start font-normal">{t('status')}</th>
    </tr></thead><tbody>{paid.map(player => {
      const summary = currentPayment(player.lastPayment);
      return <tr key={player.playerId} className="border-t border-line-soft">
        <td className="py-inline pe-inline"><button onClick={() => { setAction('history'); setSelectedId(player.playerId); }} className={`${secondaryButtonClass} min-h-12 text-start`}>{player.fullName}<RowChevron /></button></td>
      <td className="py-stack pe-inline font-display tabular-nums">{summary.paid > 0 ? formatNumber(summary.paid, locale) : legacy('noAmount')}</td>
      <td className="py-stack pe-inline text-muted">{methodT(summary.method)}</td>
      <td className="hidden py-stack pe-inline text-muted min-[761px]:table-cell">{player.lastPayment && formatTimestampAr(player.lastPayment.created_at, { day: 'numeric', month: 'long' }, locale, timezone)}</td>
      <td className="py-stack"><span className={`inline-flex rounded-full px-stack py-inline text-xs ${summary.paid > 0 ? 'bg-lime-soft text-lime' : 'bg-surface-raised text-muted'}`}>{t(summary.status)}</span>
        {!player.lastPayment && <Button variant="secondary" onClick={() => { setAction(player.pending ? 'activate' : 'renew'); setSelectedId(player.playerId); }}>{payment('record')}</Button>}</td>
    </tr>;
    })}</tbody></table> : <p className="py-stack text-sm text-faint">{legacy('noPayments')}</p>}
    {selected && <Detail key={`${selected.playerId}:${selected.accessUntil}:${selected.lastPayment?.id}:${selected.due}`} player={selected} packages={packages} today={today} initialAction={action} onClose={() => setSelectedId(null)} />}
    {picking && <Picker players={players} onClose={() => setPicking(false)} onChoose={player => {
      setPicking(false); setAction(player.pending ? 'activate' : player.due > 0 ? 'collect' : 'renew'); setSelectedId(player.playerId);
    }} />}
  </section>;
}
