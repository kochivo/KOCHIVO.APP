'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { LoadingState } from '@/ui/loading-state';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useNotifications } from '../hooks/use-notifications';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';

const NotificationDropdown = dynamic(() => import('./notification-dropdown').then(module => module.NotificationDropdown), {
  loading: () => <LoadingState />,
});

export function NotificationBell({ captain = false, round = false }: { captain?: boolean; round?: boolean }) {
  const t = useT(messages);
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();
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
  return <div className="relative">
    <Button id={id} type="button" aria-label={t('title')} aria-haspopup={workspace ? undefined : 'dialog'} aria-expanded={workspace ? undefined : open}
      onClick={() => workspace ? router.push('/captain/notifications') : setOpen(value => !value)} variant={(round) ? 'secondary' : 'secondary'} block={false} className={round ? "relative flex size-12 shrink-0 px-0 items-center justify-center bg-surface-raised text-ink" : "relative flex min-h-12 min-w-12 items-center justify-center"}>
      <Bell className="size-5 shrink-0" aria-hidden />
      {notifications.count > 0 && <span aria-hidden className="absolute end-2 top-2 size-2 rounded-full bg-lime shadow-sm shadow-lime/30" />}
    </Button>
    {open && <NotificationDropdown openerId={id} notifications={notifications} onClose={() => setOpen(false)} />}
  </div>;
}
