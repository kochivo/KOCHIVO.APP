'use client';
import { useTimezone } from '@/core/timezone/client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateAr, formatTimestampAr } from '@/lib/dates';
import { Button } from '@/ui';
import { renewPlayer } from '../data/billing';
import { collectPayment } from '../data/finance-actions';
import { remaining } from '../finance';
import { reminderText, renewalPreview, waLink } from '../renew';
import type { BillingPlayer, Package } from '../types';
import { CollectSheet } from './collect-sheet';
import { RenewSheet } from './renew-sheet';
import type { Renewal } from './renew-sheet';
import { useToast } from '@/ui/toast';
import { messages as uiMessages } from '@/ui/messages';
import { BalanceBadges } from './balance-badges';
import { ActivatePlayerButton } from './activate-player-button';

const statuses = {
  active: { label: 'active', color: 'bg-lime-soft text-lime' },
  ending: { label: 'ending', color: 'bg-warn-soft text-warn' },
  grace: { label: 'grace', color: 'bg-danger-soft text-danger' },
  expired: { label: 'expired', color: 'bg-danger-soft text-danger' },
  late: { label: 'late', color: 'bg-warn-soft text-warn' },
} as const;

export function PlayerBillingRow({ player, today, packages }: { player: BillingPlayer; today: string; packages: Package[] }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const feedback = useT(uiMessages);
  const toast = useToast();
  const locale = useLocale();
  const [accessUntil, setAccessUntil] = useState(player.accessUntil);
  const [lastPayment, setLastPayment] = useState<Pick<NonNullable<BillingPlayer['lastPayment']>, 'created_at' | 'amount_egp' | 'days'> | null>(player.lastPayment);
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState(player.due);
  const [collecting, setCollecting] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();
  const status = statuses[player.status];
  const reminder = waLink(player.phone, reminderText(player.fullName, accessUntil, locale));

  async function save(renewal: Renewal) {
    if (inFlight.current || player.frozenAt) return;
    inFlight.current = true;
    const chosen = packages.find((item) => item.id === renewal.packageId);
    const days = chosen?.days ?? renewal.days ?? 0;
    const oldAccess = accessUntil;
    const oldPayment = lastPayment;
    const oldDue = due;
    setAccessUntil(renewalPreview(accessUntil, today, days, chosen?.kind).end);
    setLastPayment({ created_at: today, amount_egp: renewal.amount, days });
    setDue(due + remaining(renewal.price ?? chosen?.price_egp ?? null, renewal.amount));
    setOpen(false);
    setPending(true);
    setError('');
    function rollback(message: string) {
      setAccessUntil(oldAccess);
      setLastPayment(oldPayment);
      setDue(oldDue);
      setError(message);
    }
    try {
      const result = await renewPlayer({ playerId: player.playerId, ...renewal });
      if (result.error || !result.data) rollback(result.error ?? t('renewFailed'));
      else {
        setAccessUntil(result.data);
        toast.success(feedback('playerRenewed'));
        startRefresh(() => router.refresh());
      }
    } catch {
      rollback(t('renewFailed'));
    } finally { inFlight.current = false; setPending(false); }
  }
  async function collect(amount: number) {
    if (inFlight.current) return;
    inFlight.current = true;
    const oldDue = due;
    setDue(due - amount);
    setCollecting(false);
    setPending(true);
    setError('');
    try {
      const result = await collectPayment({ playerId: player.playerId, amount });
      if (result.error !== undefined) { setDue(oldDue); setError(result.error); }
      else { setDue(result.data); toast.success(feedback('paymentRecorded')); startRefresh(() => router.refresh()); }
    } catch { setDue(oldDue); setError(t('collectFailed')); } finally { inFlight.current = false; setPending(false); }
  }

  return (
    <li className="glass space-y-4 rounded-card p-5" aria-busy={pending || refreshing}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">{player.fullName}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <BalanceBadges {...player} />
          {due > 0 && <span className="rounded-control bg-warn-soft px-3 py-1 text-xs font-bold text-warn">{t('owes', { amount: formatNumber(due, locale) })}</span>}
          {!player.pending && !player.frozenAt && <span className={`rounded-control px-3 py-1 text-xs ${status.color}`}>{t(status.label)}</span>}
        </div>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">{t('accessUntil')}</dt><dd aria-live="polite" className="mt-1"><time dateTime={accessUntil}>{formatDateAr(accessUntil, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time></dd></div>
        <div><dt className="text-muted">{t('lastPayment')}</dt><dd className="mt-1">{lastPayment ? <>
          <time dateTime={lastPayment.created_at}>{lastPayment.created_at.length === 10 ? formatDateAr(lastPayment.created_at, { day: 'numeric', month: 'long', year: 'numeric' }, locale) : formatTimestampAr(lastPayment.created_at, { day: 'numeric', month: 'long', year: 'numeric' }, locale, timezone)}</time>
          {' · '}{lastPayment.amount_egp === null ? t('noAmount') : t('amount', { amount: formatNumber(lastPayment.amount_egp, locale) })}{' · '}{t('days', { n: lastPayment.days, count: formatNumber(lastPayment.days, locale) })}
        </> : t('noPayments')}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {!player.pending && <Button variant="ghost" disabled={pending || refreshing || Boolean(player.frozenAt)} onClick={() => setOpen(true)} className="min-h-12">{player.frozenAt ? t('unfreezeFirst') : pending || refreshing ? t('renewing') : t('renew')}</Button>}
        {due > 0 && <Button variant="secondary" disabled={pending || refreshing} onClick={() => setCollecting(true)} className="min-h-12">{pending ? t('collecting') : t('collect')}</Button>}
        {reminder && <a href={reminder} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-control px-4 text-sm hover:bg-surface-raised">{t('remind')}</a>}
      </div>
      {player.pending && <ActivatePlayerButton playerId={player.playerId} name={player.fullName} today={today} />}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {open && !player.frozenAt && <RenewSheet name={player.fullName} accessUntil={accessUntil} today={today} packages={packages} onClose={() => setOpen(false)} onSave={(renewal) => void save(renewal)} />}
      {collecting && <CollectSheet name={player.fullName} due={due} onClose={() => setCollecting(false)} onSave={(amount) => void collect(amount)} />}
    </li>
  );
}
