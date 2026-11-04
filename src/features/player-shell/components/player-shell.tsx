'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/ui';
import dynamic from 'next/dynamic';
import { NotificationBell } from '@/features/notifications';
import { daysBetween, localDate } from '@/lib/dates';
import { whatsappUrl } from '@/lib/whatsapp';
import { accessState } from '../access';
import { playerNav, showsNav } from '../nav';
import { MyCaptainContext, useMyCaptain } from '../hooks/use-my-captain';
import { useOnline } from '../hooks/use-online';
import { useDeviceRole } from '@/core/pwa/use-device-role';

const FeedbackButton = dynamic(() => import('@/features/feedback').then(module => module.FeedbackButton), { ssr: false });
const InstallSheet = dynamic(() => import('@/features/install').then(module => module.InstallSheet), { ssr: false });
const RestMoodSync = dynamic(() => import('@/features/player-home').then(module => module.RestMoodSync), { ssr: false });

export function PlayerShell({ children }: { children: ReactNode }) {
  useDeviceRole('player');
  const t = useT(messages);
  const locale = useLocale();
  const pathname = usePathname();
  const captain = useMyCaptain();
  const online = useOnline();
  const workout = /\/player\/workout(?:\/|$)/.test(pathname);
  const [restMood, setRestMood] = useState(false);
  const today = localDate(new Date());
  const state = captain.data ? accessState({ ...captain.data, today }) : 'active';
  const url = whatsappUrl({ phone: captain.data?.phone ?? '' });
  const left = captain.data ? daysBetween(today, captain.data.accessUntil) : 0;
  const message = state === 'ending' ?
    t('subscriptionEndsIn', { n: left }) :
    state === 'ended' ? t('yourSubscriptionEndedContactYourCoach') :
    state === 'archived' ? t('yourCoachPausedYourCoaching') : null;
  return <MyCaptainContext.Provider value={captain}>
    <div data-mood={!workout && restMood ? 'rest' : undefined} className="min-h-dvh bg-bg text-ink transition-colors motion-reduce:transition-none">
    {!workout && <RestMoodSync onChange={setRestMood} />}
    <div className={workout ? undefined : showsNav(pathname) ? 'pb-[calc(var(--nav-clearance)+1rem)]' : 'pt-[var(--safe-top)]'}>
    {showsNav(pathname) && <div className="sticky top-0 z-30 bg-bg/70 pb-3 pt-[max(0.75rem,var(--safe-top))] backdrop-blur-md"><div className="mx-auto flex max-w-lg justify-end px-5"><NotificationBell /></div></div>}
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
    {showsNav(pathname) && <FeedbackButton role="player" />}
    {showsNav(pathname) && <BottomNav aria-label={t('navigation')} items={playerNav(pathname, locale)} />}
    </div>
  </MyCaptainContext.Provider>;
}
