'use client';
import { IconButton } from '@/ui/icon-button';
import { Button } from '@/ui/button';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ClipboardCheck, Dumbbell, X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../messages';
import { notificationHref, notificationIcon, notificationTextKey, relativeTime } from '../format';
import type { useNotifications } from '../hooks/use-notifications';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

interface Props {
  openerId: string;
  notifications: ReturnType<typeof useNotifications>;
  onClose: () => void;
}

export function NotificationDropdown({ openerId, notifications: n, onClose }: Props) {
  const t = useT(messages);
  const router = useRouter();
  const pathname = usePathname();
  const v6 = captainWorkspaceEnabled() && /^(?:\/(?:ar|en))?\/player(?:\/|$)/.test(pathname);
  const [now] = useState(() => Date.now());
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !panel.current?.contains(event.target)
        && !document.getElementById(openerId)?.contains(event.target)) onClose();
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [onClose, openerId]);
  return <ResponsiveDialog openerId={openerId} fallbackId={openerId} onDismiss={onClose}
    aria-labelledby={`${openerId}-title`}
    className="sheet fixed inset-x-0 bottom-0 top-auto z-50 m-0 max-h-[80dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line p-card text-ink backdrop:bg-bg-deep/80 lg:absolute lg:inset-x-auto lg:end-0 lg:top-full lg:bottom-auto lg:mt-inline lg:w-96 lg:rounded-card">
    <div ref={panel}>
      <header className={v6 ? 'flex flex-wrap items-center justify-between gap-stack' : 'flex items-center justify-between gap-stack'}>
        <h2 id={`${openerId}-title`} className={v6 ? 'font-display text-2xl font-semibold' : 'font-bold'}>{t('title')}</h2>
        {v6 && <Button variant="secondary" type="button" disabled={n.pending || n.count === 0} onClick={() => void n.read()}
          className="min-h-12 text-xs text-faint disabled:opacity-50">{t('markAll')}</Button>}
        {captainWorkspaceEnabled() ? <IconButton type="button" aria-label={t('close')} onClick={onClose} className="flex min-h-12 min-w-12 items-center justify-center">
          <X aria-hidden className="size-5" />
        </IconButton> : <button type="button" aria-label={t('close')} onClick={onClose} className="flex min-h-12 min-w-12 items-center justify-center">
          <X aria-hidden className="size-5" />
        </button>}
      </header>
      {!v6 && (captainWorkspaceEnabled() ? <Button variant="secondary" type="button" disabled={n.pending || n.count === 0} onClick={() => void n.read()}
        className="min-h-12 text-sm font-bold text-lime disabled:opacity-50">{t('markAll')}</Button> :
        <button type="button" disabled={n.pending || n.count === 0} onClick={() => void n.read()}
          className="min-h-12 text-sm font-bold text-lime disabled:opacity-50">{t('markAll')}</button>)}
      {n.saveError && <p role="alert" className="text-sm text-danger">{t('saveError')}</p>}
      {n.status === 'loading' ? <p role="status" className="p-card text-muted">{t('loading')}</p>
        : n.status === 'error' ? <div role="alert" className="p-card">
          <p>{t('error')}</p>{captainWorkspaceEnabled() ? <Button variant="secondary" type="button" onClick={() => void n.refresh()} className="min-h-12 text-lime">{t('retry')}</Button> :
            <button type="button" onClick={() => void n.refresh()} className="min-h-12 text-lime">{t('retry')}</button>}
        </div> : n.rows.length === 0 ? <p className="p-card text-muted">{t('empty')}</p>
          : <ul className={v6 ? 'glass divide-y divide-line-soft overflow-hidden rounded-card border border-line-soft' : 'divide-y divide-line'}>{n.rows.map(row => {
            const time = relativeTime(row.created_at, now);
            const Icon = notificationIcon(row) ?? (v6 ? row.type === 'plan_assigned' ? Dumbbell : row.type === 'form_requested' ? ClipboardCheck : Bell : null);
            const iconColour = row.type === 'rank_up' || row.type.startsWith('crown_') ? 'text-warn'
              : row.type === 'subscription_expired' ? 'text-danger' : row.type === 'plan_assigned' ? 'text-lime' : 'text-muted';
            return <li key={row.id}>
              <Link href={notificationHref(row)} aria-disabled={n.pending}
                className={v6 ? 'relative block min-h-16 px-page-x py-page-y text-start pe-section' : `block min-h-12 rounded-control p-stack text-start ${row.is_read ? 'text-muted' : 'font-semibold text-ink'}`}
                onClick={async event => {
                  if (n.pending) { event.preventDefault(); return; }
                  if (row.is_read) { onClose(); return; }
                  event.preventDefault();
                  if (await n.read(row.id)) {
                    onClose();
                    router.push(notificationHref(row));
                  }
                }}>
                <p className="flex items-center gap-inline">
                  {Icon && (v6 ? <span className={`glass grid size-10 shrink-0 place-items-center rounded-xl ${iconColour}`}><Icon aria-hidden className="size-5" /></span>
                    : <Icon aria-hidden className="size-5 shrink-0" />)}
                  {t(notificationTextKey(row), { name: row.payload.name || row.payload.captain_name || '',
                    n: row.payload.needs_workouts ?? 0, gap: row.payload.gap ?? 0 })}
                </p>
                <time dateTime={row.created_at} className={v6 ? 'ms-touch mt-inline block text-micro text-faint' : 'mt-inline block text-xs font-normal text-muted'}>{t(time.key, { n: time.n })}</time>
                {v6 && !row.is_read && <span aria-hidden className="absolute end-3 top-7 size-2 rounded-full bg-lime" />}
              </Link>
            </li>;
          })}</ul>}
    </div>
  </ResponsiveDialog>;
}
