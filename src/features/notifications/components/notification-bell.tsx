'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { LoadingState } from '@/ui/loading-state';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useNotifications } from '../hooks/use-notifications';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button, buttonClass } from '@/ui/button';

const NotificationDropdown = dynamic(() => import('./notification-dropdown').then(module => module.NotificationDropdown), {
  loading: () => <LoadingState />,
});

export function NotificationBell({ captain = false, round = false }: { captain?: boolean; round?: boolean }) {
  const t = useT(messages);
  const id = useId();
  const pathname = usePathname();
  const workspace = captain && captainWorkspaceEnabled();
  const [open, setOpen] = useState(false);
  const notifications = useNotifications(open);
  const { refresh } = notifications;
  useEffect(() => {
    if (captain && pathname === '/captain') {
      void import('../data/refresh-inactive').then(async ({ refreshInactiveAlerts }) => {
        await refreshInactiveAlerts(new Date());
        await refresh();
      }).catch(error => console.warn('Could not load inactivity refresh', error));
    }
  }, [captain, pathname, refresh]);
  const className = round ? 'relative flex size-12 shrink-0 px-0 items-center justify-center bg-surface-raised text-ink' : 'relative flex min-h-12 min-w-12 items-center justify-center';
  const icon = <><Bell className="size-5 shrink-0" aria-hidden />
    {notifications.count > 0 && <span aria-hidden className="absolute end-2 top-2 size-2 rounded-full bg-lime shadow-sm shadow-lime/30" />}</>;
  return <div className="relative">
    {workspace ? <Link href="/captain/notifications" prefetch={false}
      aria-label={notifications.count > 0 ? t('titleWithUnread') : t('title')}
      className={buttonClass({ variant: 'secondary', block: false, className })}>{icon}</Link>
      : <Button id={id} type="button" aria-label={t('title')} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(value => !value)} variant="secondary" block={false} className={className}>{icon}</Button>}
    {open && <NotificationDropdown openerId={id} notifications={notifications} onClose={() => setOpen(false)} />}
  </div>;
}
