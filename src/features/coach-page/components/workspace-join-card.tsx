'use client';

import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { joinPhoneMessages } from '../join/messages';
import { Button } from '@/ui/button';
import { KoInvite } from '@/ui/icons/ko-invite';
import { messages } from '../messages';
import { PhoneJoinCard } from './phone-join-card';

export type JoinRequestRow = {
  id: string; full_name: string; created_at?: string; package_days?: number | null; package_sessions?: number | null;
};

export function WorkspaceJoinCard({ row, now, phone, pending, onResolve }: {
  row: JoinRequestRow; now: number; phone?: boolean; pending?: boolean; onResolve: (id: string, status: 'accepted' | 'declined') => void;
}) {
  const t = useT(messages), pack = useT(joinPhoneMessages), locale = useLocale();
  const days = row.package_days == null ? null : t('packageDays', { count: formatNumber(row.package_days, locale) });
  const sessions = row.package_sessions == null ? null : pack('sessions', { n: formatNumber(row.package_sessions, locale) });
  const elapsed = row.created_at ? Math.max(0, now - Date.parse(row.created_at)) : NaN;
  const unit = elapsed >= 86400000 ? 'day' : elapsed >= 3600000 ? 'hour' : 'minute';
  const divisor = unit === 'day' ? 86400000 : unit === 'hour' ? 3600000 : 60000;
  const relative = Number.isFinite(elapsed) ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    .format(-Math.floor(elapsed / divisor), unit) : null;
  return <>
    <li data-join-row={row.id} tabIndex={-1} aria-busy={pending} className={`${phone ? 'hidden md:flex' : 'flex'} min-h-[58px] min-w-0 flex-wrap items-center justify-between gap-stack border-t border-line-soft p-card first:border-t-0`}>
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-stack">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-info bg-surface-raised font-bold">{row.full_name.trim().slice(0, 1)}</span>
      <div className="min-w-0 flex-1"><b className="block break-words">{row.full_name}</b>
        {relative && <small className="text-muted">{t('requestSent')} <time dateTime={row.created_at}>{relative}</time></small>}
        {(days || sessions) && <p className="text-xs text-muted">{[days, sessions].filter(Boolean).join(' · ')}</p>}
      </div>
      <span className="tone-info rounded-md px-inline text-micro font-semibold">{t('newRequest')}</span>
    </div>
    <div className="flex flex-wrap gap-inline">
      <Button aria-disabled={pending} className="min-h-12 flex-1" onClick={() => onResolve(row.id, 'accepted')}><KoInvite aria-hidden className="size-4" />{t('accept')}</Button>
      <Button aria-disabled={pending} variant="secondary" className="min-h-12" onClick={() => onResolve(row.id, 'declined')}><X aria-hidden className="size-4" />{t('decline')}</Button>
    </div>
    </li>
    {phone && <PhoneJoinCard row={row} relative={relative} pending={pending} onResolve={onResolve} />}
  </>;
}
