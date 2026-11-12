'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { daysBetween, formatDateAr, formatTimestampAr } from '@/lib/dates';
import { useTimezone } from '@/core/timezone/client';
import { formatNumber } from '@/lib/format';
import { reminderText, waLink } from '../renew';
import { setPlayerFrozen } from '../data/pt-actions';
import { billingState, paymentSegment } from '../workspace';
import { messages as paymentMessages } from '../payments/messages';
import { messages } from '../workspace/messages';
import { messages as legacyMessages } from '../messages';
import type { BillingPlayer, Package } from '../types';

const Detail = dynamic(() => import('./workspace-player-detail').then(m => m.WorkspacePlayerDetail));
export function WorkspaceBillingRow({ player, today, packages }: { player: BillingPlayer; today: string; packages: Package[] }) {
  const t = useT(messages), legacy = useT(legacyMessages), locale = useLocale(), router = useRouter();
  const payment = useT(paymentMessages), timezone = useTimezone();
  const [detail, setDetail] = useState<'history' | 'renew' | 'collect' | 'activate' | null>(null);
  const [frozenAt, setFrozenAt] = useState(player.frozenAt);
  const [pending, setPending] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const state = billingState({ ...player, frozenAt }, today);
  const reminder = waLink(player.phone, reminderText(player.fullName, player.accessUntil, locale));
  const segment = paymentSegment({ ...player, frozenAt }, today);
  const days = daysBetween(today, player.accessUntil);
  const date = (value: string) => formatDateAr(value, { day: 'numeric', month: 'long' }, locale);
  const chosen = packages.find(item => item.id === player.lastPayment?.package_id);
  const price = player.lastPayment?.price_egp ?? chosen?.price_egp;
  const pill = player.pending || frozenAt ? t(state.label, { n: state.days }) : days < 0 && player.sessionsLeft == null
    ? payment('late', { n: -days, count: formatNumber(-days, locale) }) : player.due > 0 ? payment('balance', { amount: formatNumber(player.due, locale) })
      : player.sessionsLeft === 0 ? payment('sessionsEnded') : segment === 'ending' ? payment('ends', { n: days, count: formatNumber(days, locale) }) : payment('until', { date: date(player.accessUntil) });
  async function action() {
    if (state.action === 'unfreeze' && player.linkId) {
      if (lock.current) return;
      lock.current = true; setPending(true); setError(''); setFrozenAt(null);
      try {
        const result = await setPlayerFrozen(player.linkId, false);
        if (result.error) throw new Error(result.error);
        router.refresh();
      } catch (error) { setFrozenAt(player.frozenAt); setError(error instanceof Error ? error.message : t('failure')); }
      finally { setPending(false); lock.current = false; }
    } else setDetail(state.action === 'renew' ? 'renew' : state.action === 'activate' ? 'activate'
      : state.action === 'record' ? player.due > 0 ? 'collect' : 'renew' : 'history');
  }
  return <li className="border-t border-line-soft">
    <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-[18px] py-3 min-[761px]:grid-cols-[1.4fr_1fr_1fr_1fr_150px]"
      onClick={() => setDetail('history')}>
      <button type="button" className="flex min-h-12 min-w-0 items-center gap-2.5 text-start" onClick={event => { event.stopPropagation(); setDetail('history'); }}>
        <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-full border border-line bg-surface-raised text-xs">{player.fullName.slice(0, 1)}</span>
        <span className="break-words text-sm">{player.fullName}</span></button>
      <span className="hidden text-[13px] text-muted min-[761px]:block">{chosen?.name ?? (player.lastPayment ? legacy('days', { n: player.lastPayment.days, count: formatNumber(player.lastPayment.days, locale) }) : legacy('noPayments'))}{price != null && <> · {formatNumber(price, locale)}</>}</span>
      <span className="hidden text-[13px] text-faint min-[761px]:block">{player.lastPayment ? <time dateTime={player.lastPayment.created_at}>{formatTimestampAr(player.lastPayment.created_at, { day: 'numeric', month: 'long' }, locale, timezone)}</time> : legacy('noPayments')}</span>
      <div><span className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] ${segment === 'overdue' ? 'bg-danger-soft text-danger' : segment === 'ending' ? 'bg-warn-soft text-warn' : state.tone}`}>{pill}</span></div>
      <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 min-[761px]:col-span-1">
        {(segment === 'overdue' || segment === 'ending') && <button type="button" disabled={!reminder} title={!reminder ? t('noPhone') : undefined} onClick={event => { event.stopPropagation(); if (reminder) window.open(reminder, '_blank', 'noopener,noreferrer'); }}
          className="min-h-12 rounded-full border border-line px-3 text-[12.5px] disabled:opacity-40">{payment('remind')}</button>}
        {(segment === 'overdue' || player.pending || frozenAt) && <button type="button" disabled={pending} onClick={event => { event.stopPropagation(); void action(); }}
          className="min-h-12 rounded-full border border-line px-3 text-[12.5px] disabled:opacity-40">{segment === 'overdue' ? payment('received') : t(state.action)}</button>}
      </div>
    </div>
    {error && <p role="alert" className="px-4 pb-3 text-sm text-danger">{error}</p>}
    {detail && <Detail player={{ ...player, frozenAt }} today={today} packages={packages} initialAction={detail} onClose={() => setDetail(null)} />}
  </li>;
}
