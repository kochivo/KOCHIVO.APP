'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../messages';
import { notificationHref, relativeTime } from '../format';
import type { useNotifications } from '../hooks/use-notifications';

interface Props {
  openerId: string;
  notifications: ReturnType<typeof useNotifications>;
  onClose: () => void;
}

export function NotificationDropdown({ openerId, notifications: n, onClose }: Props) {
  const t = useT(messages);
  const router = useRouter();
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
    className="sheet fixed inset-x-0 bottom-0 top-auto z-50 m-0 max-h-[80dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line p-4 text-ink backdrop:bg-bg-deep/80 lg:absolute lg:inset-x-auto lg:end-0 lg:top-full lg:bottom-auto lg:mt-2 lg:w-96 lg:rounded-card">
    <div ref={panel}>
      <header className="flex items-center justify-between gap-3">
        <h2 id={`${openerId}-title`} className="font-bold">{t('title')}</h2>
        <button type="button" aria-label={t('close')} onClick={onClose} className="flex min-h-12 min-w-12 items-center justify-center">
          <X aria-hidden className="size-5" />
        </button>
      </header>
      <button type="button" disabled={n.pending || n.count === 0} onClick={() => void n.read()}
        className="min-h-12 text-sm font-bold text-lime disabled:opacity-50">{t('markAll')}</button>
      {n.saveError && <p role="alert" className="text-sm text-danger">{t('saveError')}</p>}
      {n.status === 'loading' ? <p role="status" className="p-4 text-muted">{t('loading')}</p>
        : n.status === 'error' ? <div role="alert" className="p-4">
          <p>{t('error')}</p><button type="button" onClick={() => void n.refresh()} className="min-h-12 text-lime">{t('retry')}</button>
        </div> : n.rows.length === 0 ? <p className="p-4 text-muted">{t('empty')}</p>
          : <ul className="divide-y divide-line">{n.rows.map(row => {
            const time = relativeTime(row.created_at, now);
            return <li key={row.id}>
              <Link href={notificationHref(row)} aria-disabled={n.pending}
                className={`block min-h-12 rounded-control p-3 text-start ${row.is_read ? 'text-muted' : 'font-semibold text-ink'}`}
                onClick={async event => {
                  if (n.pending) { event.preventDefault(); return; }
                  if (row.is_read) { onClose(); return; }
                  event.preventDefault();
                  if (await n.read(row.id)) {
                    onClose();
                    router.push(notificationHref(row));
                  }
                }}>
                <p>{t(row.type, { name: row.payload.name })}</p>
                <time dateTime={row.created_at} className="mt-1 block text-xs font-normal text-muted">{t(time.key, { n: time.n })}</time>
              </Link>
            </li>;
          })}</ul>}
    </div>
  </ResponsiveDialog>;
}
