'use client';
import { profileTimezone } from '@/lib/timezone';
import { useArabicStyle, useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { BottomNav, ErrorState, LoadingState } from '@/ui';
import dynamic from 'next/dynamic';
import { NotificationBell } from '@/features/notifications';
import Link from 'next/link';
import { Settings, UserRound } from 'lucide-react';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { daysBetween, formatDateAr, localDate } from '@/lib/dates';
import { whatsappUrl } from '@/lib/whatsapp';
import { accessState, subscriptionNotStarted } from '../access';
import { gateApplies } from '../start-gate';
import { playerNav, showsFeedback, showsNav } from '../nav';
import { MyCaptainContext, useMyCaptain } from '../hooks/use-my-captain';
import { useOnline } from '../hooks/use-online';
import { useDeviceRole } from '@/core/pwa/use-device-role';

const FeedbackButton = dynamic(() => import('@/features/feedback').then(module => module.FeedbackButton), { ssr: false });
const InstallButton = dynamic(() => import('@/features/install').then(module => module.InstallButton), { ssr: false });
const InstallSheet = dynamic(() => import('@/features/install').then(module => module.InstallSheet), { ssr: false });
const RestMoodSync = dynamic(() => import('@/features/player-home').then(module => module.RestMoodSync), { ssr: false });
const PlayerTabs = dynamic(() => import('./player-tabs').then(module => module.PlayerTabs), { ssr: false });
const SyncRunner = dynamic(() => import('./sync-runner').then(module => module.SyncRunner), { ssr: false });
const WaitingRoom = dynamic(() => import('@/features/billing').then(module => module.PlayerWaitingRoom), { ssr: false });
const StartGateBoundary = dynamic(() => import('./start-gate-boundary').then(module => module.StartGateBoundary), { loading: () => <LoadingState variant="cards" />, ssr: false });
const NoCaptainScreen = dynamic(() => import('./no-captain-screen').then(module => module.NoCaptainScreen), { ssr: false });
const KoPreview = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/features/ko-preview').then(module => module.KoPreview), { ssr: false }) : () => null;

export function PlayerShell({ children, unassignedAction }: { children?: ReactNode; unassignedAction?: ReactNode }) {
  useDeviceRole('player');
  const t = useT(messages);
  const v6 = captainWorkspaceEnabled();
  const locale = useLocale();
  const style = useArabicStyle();
  const pathname = usePathname();
  const captain = useMyCaptain();
  const online = useOnline();
  const workout = /\/player\/workout(?:\/|$)/.test(pathname);
  const [restMood, setRestMood] = useState(false);
  const today = localDate(new Date(), profileTimezone(captain.data?.timezone));
  const state = captain.data ? accessState({ ...captain.data, today }) : 'active';
  const url = whatsappUrl({ phone: captain.data?.phone ?? '' });
  const left = captain.data ? daysBetween(today, captain.data.accessUntil) : 0;
  const blocked = captain.data?.pending || captain.data?.frozenAt;
  const futureStart = subscriptionNotStarted(captain.data?.subscriptionStartsOn, today);
  const startMessage = t('subscriptionStartsOn', { date: captain.data?.subscriptionStartsOn
    ? formatDateAr(captain.data.subscriptionStartsOn, { day: 'numeric', month: 'long', year: 'numeric' }, locale) : '' });
  const training = !/\/player\/(settings|onboarding|captain|progress)(?:\/|$)/.test(pathname);
  const message = blocked ? null : futureStart ? startMessage : state === 'ending' ?
    t(left === 0 ? 'subscriptionEndsToday' : 'subscriptionEndsIn', { n: left }) :
    state === 'ended' ? t('yourSubscriptionEndedContactYourCoach') :
    state === 'archived' ? t('yourCoachPausedYourCoaching') : null;
  if (!captain.data && !/\/player\/settings(?:\/|$)/.test(pathname)) {
    if (captain.status === 'loading') return <LoadingState variant="cards" />;
    if (captain.status === 'error') return <ErrorState message={t('couldnTLoadYourCoach')} retryLabel={t('tryAgain')} onRetry={() => void captain.retry()} />;
    if (captain.status === 'ready') return <NoCaptainScreen signOut={unassignedAction} onRetry={() => void captain.retry()} />;
  }
  return <MyCaptainContext.Provider value={captain}>
    <div data-mood={!workout && restMood ? 'rest' : undefined} className="min-h-dvh bg-bg text-ink transition-colors motion-reduce:transition-none">
    <SyncRunner />
    <div aria-hidden className="viewport-pinned pointer-events-none fixed inset-x-0 top-0 z-40 h-[var(--safe-top)] bg-bg" />
    {!workout && <RestMoodSync onChange={setRestMood} />}
    {/* P1: no bottom padding here — the player layout owns the shared launcher
      clearance (.player-content), so this div must not pad a second time. */}
    <div className={workout ? undefined : showsNav(pathname) ? (v6 ? 'pt-[var(--safe-top)]' : undefined) : 'pt-[var(--safe-top)]'}>
    {showsNav(pathname) && !v6 && <div className="sticky top-0 z-30 bg-bg/70 pb-stack pt-[max(0.75rem,var(--safe-top))] backdrop-blur-md"><div className="mx-auto flex max-w-lg justify-end gap-inline px-page-x">
      <Link href="/player/settings" aria-label={t(v6 ? 'v6Account' : 'settings')} aria-current={pathname === '/player/settings' ? 'page' : undefined}
        className={`${v6 ? 'glass border border-line-soft ' : ''}flex min-h-12 min-w-12 items-center justify-center rounded-control ${pathname === '/player/settings' ? 'bg-lime-soft text-lime' : 'text-muted'}`}>
        {v6 ? <UserRound aria-hidden className="size-5 rounded-full" /> : <Settings aria-hidden className="size-5" />}
      </Link><InstallButton icon /><NotificationBell />
    </div></div>}
    <div className="mx-auto max-w-lg space-y-stack px-page-x pt-stack" aria-live="polite">
      {!online && <p role="status" className="glass rounded-card p-card text-sm">
        {t('youReOfflineYourLogsAre')}
      </p>}
      {message && <div role="status" className="rounded-card border border-warn bg-warn-soft p-card text-sm">
        <p>{message}</p>
        {(state === 'ended' || state === 'archived') && url &&
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={t('messageYourCoachOnWhatsApp')}
            className="mt-inline flex min-h-12 items-center justify-center rounded-control border border-lime px-page-x font-bold text-lime">
            {t('messageYourCoachOnWhatsApp')}
          </a>}
      </div>}
    </div>
    {training && captain.status === 'loading' ? <LoadingState variant="cards" /> :
      training && captain.status === 'error' ? <ErrorState message={t('couldnTLoadYourCoach')} retryLabel={t('tryAgain')} onRetry={() => void captain.retry()} /> :
      training && blocked ? <WaitingRoom frozen={Boolean(captain.data?.frozenAt)} /> :
      captain.data?.startFormsPending && gateApplies(pathname) ? <StartGateBoundary key={pathname} captain={captain.data.fullName}>{children}</StartGateBoundary> : children}
    </div>
    {showsNav(pathname) && <InstallSheet />}
    {showsFeedback(pathname, v6) && <FeedbackButton role="player" />}
    {process.env.NODE_ENV === 'development' && showsNav(pathname) && <KoPreview role="player" />}
    {showsNav(pathname) && (v6 ? <PlayerTabs rest={restMood} pathname={pathname} locale={locale} style={style} label={t('navigation')} /> :
      <BottomNav aria-label={t('navigation')} items={playerNav(pathname, locale)} />)}
    </div>
  </MyCaptainContext.Provider>;
}
