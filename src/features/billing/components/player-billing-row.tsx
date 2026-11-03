'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { localDate } from '@/lib/dates';
import { Button } from '@/ui';
import { renewPlayer } from '../data/billing';
import { reminderText, renewalPreview, waLink } from '../renew';
import type { BillingPlayer } from '../types';
import { RenewSheet } from './renew-sheet';

const statuses = {
  active: { label: 'نشط', color: 'bg-lime-soft text-lime' },
  ending: { label: 'هيخلص قريب', color: 'bg-warn-soft text-warn' },
  grace: { label: 'فترة سماح', color: 'bg-danger-soft text-danger' },
  expired: { label: 'منتهي', color: 'bg-danger-soft text-danger' },
  late: { label: 'متأخر في التمرين', color: 'bg-warn-soft text-warn' },
};

export function PlayerBillingRow({ player, today }: { player: BillingPlayer; today: string }) {
  const [accessUntil, setAccessUntil] = useState(player.accessUntil);
  const [lastPayment, setLastPayment] = useState<Pick<NonNullable<BillingPlayer['lastPayment']>, 'created_at' | 'amount_egp' | 'days'> | null>(player.lastPayment);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState('');
  const router = useRouter();
  const status = statuses[player.status];
  const reminder = waLink(player.phone, reminderText(player.fullName, accessUntil));

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
      if (result.error || !result.data) rollback(result.error ?? 'التجديد متسجلش. جرّب تاني');
      else {
        setAccessUntil(result.data);
        startRefresh(() => router.refresh());
      }
    } catch {
      rollback('التجديد متسجلش. جرّب تاني');
    } finally { setPending(false); }
  }

  return (
    <li className="glass space-y-4 rounded-card p-5" aria-busy={pending || refreshing}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">{player.fullName}</h3>
        <span className={`rounded-control px-3 py-1 text-xs ${status.color}`}>{status.label}</span>
      </div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">الاشتراك لحد</dt><dd aria-live="polite" className="mt-1"><time dateTime={accessUntil}>{accessUntil}</time></dd></div>
        <div><dt className="text-muted">آخر دفعة</dt><dd className="mt-1">{lastPayment ? <>
          <time dateTime={lastPayment.created_at}>{lastPayment.created_at.length === 10 ? lastPayment.created_at : localDate(new Date(lastPayment.created_at))}</time>
          {' · '}{lastPayment.amount_egp === null ? 'من غير مبلغ' : `${lastPayment.amount_egp} جنيه`}{' · '}{lastPayment.days} يوم
        </> : 'لسه مفيش دفعات'}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={pending || refreshing} onClick={() => setOpen(true)} className="min-h-12">{pending || refreshing ? 'جاري التجديد' : 'جدّد'}</Button>
        {reminder && <a href={reminder} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-control px-4 text-sm hover:bg-surface-raised">فكّره</a>}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {open && <RenewSheet name={player.fullName} accessUntil={accessUntil} today={today} onClose={() => setOpen(false)} onSave={save} />}
    </li>
  );
}
