'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { joinPhoneMessages } from '../join/messages';
import { messages } from '../messages';
import type { JoinRequestRow } from './workspace-join-card';

export function PhoneJoinCard({ row, relative, pending, onResolve }: {
  row: JoinRequestRow; relative: string | null; pending?: boolean;
  onResolve: (id: string, status: 'accepted' | 'declined') => void;
}) {
  const t = useT(joinPhoneMessages), join = useT(messages), locale = useLocale();
  const days = row.package_days == null ? null : join('packageDays', { count: formatNumber(row.package_days, locale) });
  const sessions = row.package_sessions == null ? null : t('sessions', { n: formatNumber(row.package_sessions, locale) });
  return <li data-join-row={row.id} tabIndex={-1} aria-busy={pending} className="glass flex min-w-0 flex-col gap-card-gap rounded-card p-card md:hidden">
    <div className="flex items-center gap-card-gap">
      <span aria-hidden className="grid size-13 shrink-0 place-items-center rounded-full border-2 border-info bg-surface-raised text-title font-bold">{row.full_name.trim().slice(0, 1)}</span>
      <div className="min-w-0 flex-1">
        <b className="block break-words text-md">{row.full_name}</b>
        <p className="text-xs text-muted">{t('source')}{relative && <> · <time dateTime={row.created_at}>{relative}</time></>}</p>
      </div>
    </div>
    {(days || sessions) && <dl className="flex justify-between gap-inline text-row">
      <dt className="text-muted">{t('packageLabel')}</dt><dd>{[days, sessions].filter(Boolean).join(' · ')}</dd>
    </dl>}
    <div className="flex gap-inline">
      <Button aria-disabled={pending} variant="secondary" size="lg" className="border-danger/30 text-danger" onClick={() => onResolve(row.id, 'declined')}>{join('decline')}</Button>
      <Button aria-disabled={pending} size="lg" className="min-w-0 flex-1" onClick={() => onResolve(row.id, 'accepted')}>{t('start')}</Button>
    </div>
  </li>;
}
