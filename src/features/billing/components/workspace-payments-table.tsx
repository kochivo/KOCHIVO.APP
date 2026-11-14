'use client';
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
  const paid = players.filter(player => player.lastPayment).sort((a, b) => (b.lastPayment?.created_at ?? '').localeCompare(a.lastPayment?.created_at ?? ''));
  return <section className="glass min-w-0 rounded-card border border-line-soft p-[18px]">
    <header className="mb-3 flex items-center justify-between gap-3"><h2 className="font-semibold">{t('all')}</h2>
      {players.length > 0 && <button onClick={() => setPicking(true)} className="glass min-h-12 rounded-full border border-line px-4 text-sm">{payment('record')}</button>}</header>
    {paid.length ? <table className="w-full text-start text-[13px]"><caption className="pb-3 text-start text-xs text-faint">{t('latest')}</caption><thead><tr className="text-xs text-faint">
      <th className="py-3 text-start font-normal">{t('player')}</th><th className="py-3 text-start font-normal">{t('amount')}</th>
      <th className="py-3 text-start font-normal">{methodT('method')}</th>
      <th className="hidden py-3 text-start font-normal min-[761px]:table-cell">{t('date')}</th><th className="py-3 text-start font-normal">{t('status')}</th>
    </tr></thead><tbody>{paid.map(player => <tr key={player.playerId} className="border-t border-line-soft">
      <td className="py-1 pe-2"><button onClick={() => { setAction('history'); setSelectedId(player.playerId); }} className="min-h-12 text-start">{player.fullName}</button></td>
      <td className="py-3 pe-2 font-display tabular-nums">{player.lastPayment?.amount_egp == null ? legacy('noAmount') : formatNumber(player.lastPayment.amount_egp, locale)}</td>
      <td className="py-3 pe-2 text-muted">{methodT(player.lastPayment?.method ?? 'unset')}</td>
      <td className="hidden py-3 pe-2 text-muted min-[761px]:table-cell">{player.lastPayment && formatTimestampAr(player.lastPayment.created_at, { day: 'numeric', month: 'long' }, locale, timezone)}</td>
      <td className="py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${(player.lastPayment?.amount_egp ?? 0) > 0 ? 'bg-lime-soft text-lime' : 'bg-surface-raised text-muted'}`}>{t((player.lastPayment?.amount_egp ?? 0) > 0 ? 'confirmed' : 'renewalOnly')}</span></td>
    </tr>)}</tbody></table> : <p className="py-3 text-sm text-faint">{legacy('noPayments')}</p>}
    {selected && <Detail key={`${selected.playerId}:${selected.accessUntil}:${selected.lastPayment?.id}:${selected.due}`} player={selected} packages={packages} today={today} initialAction={action} onClose={() => setSelectedId(null)} />}
    {picking && <Picker players={players} onClose={() => setPicking(false)} onChoose={player => {
      setPicking(false); setAction(player.pending ? 'activate' : player.due > 0 ? 'collect' : 'renew'); setSelectedId(player.playerId);
    }} />}
  </section>;
}
