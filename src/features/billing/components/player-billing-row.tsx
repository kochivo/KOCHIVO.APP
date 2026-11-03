'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateAr, formatTimestampAr } from '@/lib/dates';
import { Button } from '@/ui';
import { renewPlayer } from '../data/billing';
import { reminderText, renewalPreview, waLink } from '../renew';
import type { BillingPlayer } from '../types';
import { RenewSheet } from './renew-sheet';

const statuses = {
  active: { label: 'active', color: 'bg-lime-soft text-lime' },
  ending: { label: 'ending', color: 'bg-warn-soft text-warn' },
  grace: { label: 'grace', color: 'bg-danger-soft text-danger' },
  expired: { label: 'expired', color: 'bg-danger-soft text-danger' },
  late: { label: 'late', color: 'bg-warn-soft text-warn' },
} as const;

export function PlayerBillingRow({ player, today }: { player: BillingPlayer; today: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const [accessUntil, setAccessUntil] = useState(player.accessUntil);
  const [lastPayment, setLastPayment] = useState<Pick<NonNullable<BillingPlayer['lastPayment']>, 'created_at' | 'amount_egp' | 'days'> | null>(player.lastPayment);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();
  const status = statuses[player.status];
  const reminder = waLink(player.phone, reminderText(player.fullName, accessUntil, locale));

  async function save(days: number, amount: number | null) {
    const oldAccess = accessUntil;
    const oldPayment = lastPayment;
    setAccessUntil(renewalPreview(accessUntil, today, days).end);
    setLastPayment({ created_at: today, amount_egp: amount, days });
    setOpen(false);
    setPending(true);
    setError('');
    function rollback(message: string) {
      setAccessUntil(oldAccess);
      setLastPayment(oldPayment);
      setError(message);
    }
    try {
      const result = await renewPlayer({ playerId: player.playerId, days, amount });
      if (result.error || !result.data) rollback(result.error ?? t('renewFailed'));
      else {
        setAccessUntil(result.data);
        startRefresh(() => router.refresh());
      }
    } catch {
      rollback(t('renewFailed'));
    } finally { setPending(false); }
  }

  return (
    <li className="glass space-y-4 rounded-card p-5" aria-busy={pending || refreshing}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">{player.fullName}</h3>
        <span className={`rounded-control px-3 py-1 text-xs ${status.color}`}>{t(status.label)}</span>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">{t('accessUntil')}</dt><dd aria-live="polite" className="mt-1"><time dateTime={accessUntil}>{formatDateAr(accessUntil, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time></dd></div>
        <div><dt className="text-muted">{t('lastPayment')}</dt><dd className="mt-1">{lastPayment ? <>
          <time dateTime={lastPayment.created_at}>{lastPayment.created_at.length === 10 ? formatDateAr(lastPayment.created_at, { day: 'numeric', month: 'long', year: 'numeric' }, locale) : formatTimestampAr(lastPayment.created_at, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time>
          {' · '}{lastPayment.amount_egp === null ? t('noAmount') : t('amount', { amount: formatNumber(lastPayment.amount_egp, locale) })}{' · '}{t('days', { n: lastPayment.days, count: formatNumber(lastPayment.days, locale) })}
        </> : t('noPayments')}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={pending || refreshing} onClick={() => setOpen(true)} className="min-h-12">{pending || refreshing ? t('renewing') : t('renew')}</Button>
        {reminder && <a href={reminder} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-control px-4 text-sm hover:bg-surface-raised">{t('remind')}</a>}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {open && <RenewSheet name={player.fullName} accessUntil={accessUntil} today={today} onClose={() => setOpen(false)} onSave={save} />}
    </li>
  );
}
