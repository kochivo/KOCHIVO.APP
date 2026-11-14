'use client';

import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { KoInvite } from '@/ui/icons/ko-invite';
import { messages } from '../messages';

export type JoinRequestRow = { id: string; full_name: string; created_at?: string };

export function WorkspaceJoinCard({ row, now, onResolve }: {
  row: JoinRequestRow; now: number; onResolve: (id: string, status: 'accepted' | 'declined') => void;
}) {
  const t = useT(messages), locale = useLocale();
  const elapsed = row.created_at ? Math.max(0, now - Date.parse(row.created_at)) : NaN;
  const unit = elapsed >= 86400000 ? 'day' : elapsed >= 3600000 ? 'hour' : 'minute';
  const divisor = unit === 'day' ? 86400000 : unit === 'hour' ? 3600000 : 60000;
  const relative = Number.isFinite(elapsed) ? new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    .format(-Math.floor(elapsed / divisor), unit) : null;
  return <li className="glass min-w-0 rounded-card p-[18px]">
    <div className="mb-3 flex items-center gap-2.5">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface-raised font-bold">{row.full_name.trim().slice(0, 1)}</span>
      <div className="min-w-0 flex-1"><b className="block break-words">{row.full_name}</b>
        {relative && <small className="text-muted">{t('requestSent')} <time dateTime={row.created_at}>{relative}</time></small>}
      </div>
      <span className="rounded-full border border-calm/30 bg-calm/10 px-2.5 py-1 text-xs font-bold text-calm">{t('newRequest')}</span>
    </div>
    <div className="mt-3 flex gap-2">
      <Button className="min-h-12 flex-1" onClick={() => onResolve(row.id, 'accepted')}><KoInvite aria-hidden className="size-4" />{t('accept')}</Button>
      <Button variant="secondary" className="min-h-12" onClick={() => onResolve(row.id, 'declined')}><X aria-hidden className="size-4" />{t('decline')}</Button>
    </div>
  </li>;
}
