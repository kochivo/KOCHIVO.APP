'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/ui';
import { InstallSheet } from '@/features/install';
import { NotificationBell } from '@/features/notifications';
import { daysBetween, localDate } from '@/lib/dates';
import { whatsappUrl } from '@/lib/whatsapp';
import { accessState } from '../access';
import { playerNav, showsNav } from '../nav';
import { MyCaptainContext, useMyCaptain } from '../hooks/use-my-captain';
import { useOnline } from '../hooks/use-online';

export function PlayerShell({ children }: { children: ReactNode }) {
  const t = useT(messages);
  const locale = useLocale();
  const pathname = usePathname();
  const captain = useMyCaptain();
  const online = useOnline();
  const workout = /\/player\/workout(?:\/|$)/.test(pathname);
  const today = localDate(new Date());
  const state = captain.data ? accessState({ ...captain.data, today }) : 'active';
  const url = whatsappUrl({ phone: captain.data?.phone ?? '' });
  const left = captain.data ? daysBetween(today, captain.data.accessUntil) : 0;
  const message = state === 'ending' ?
    t('subscriptionEndsIn', { n: left }) :
    state === 'ended' ? t('yourSubscriptionEndedContactYourCoach') :
    state === 'archived' ? t('yourCoachPausedYourCoaching') : null;
  return <MyCaptainContext.Provider value={captain}>
    <div className={workout ? undefined : 'pt-[var(--safe-top)]'}>
    {showsNav(pathname) && <div className="mx-auto flex max-w-lg justify-end px-5 pt-3"><NotificationBell /></div>}
    <div className="mx-auto max-w-lg space-y-3 px-5 pt-3" aria-live="polite">
      {!online && <p role="status" className="glass rounded-card p-4 text-sm">
        {t('youReOfflineYourLogsAre')}
      </p>}
      {message && <div role="status" className="rounded-card border border-warn bg-warn-soft p-4 text-sm">
        <p>{message}</p>
        {(state === 'ended' || state === 'archived') && url &&
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={t('messageYourCoachOnWhatsApp')}
            className="mt-2 flex min-h-12 items-center justify-center rounded-control border border-lime px-4 font-bold text-lime">
            {t('messageYourCoachOnWhatsApp')}
          </a>}
      </div>}
    </div>
    {children}
    </div>
    {showsNav(pathname) && <InstallSheet />}
    {showsNav(pathname) && <BottomNav aria-label={t('navigation')} items={playerNav(pathname, locale)} />}
  </MyCaptainContext.Provider>;
}
