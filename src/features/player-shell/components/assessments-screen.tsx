'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ChevronRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../pages-messages';
import { PlayerAssessments } from './player-assessments-entry';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useCaptainContext } from '../hooks/use-my-captain';
import { messages as captainMessages } from '../captain-messages';

const CoachButton = dynamic(() => import('@/features/player-shell').then(module => module.CoachButton));

export function AssessmentsScreen() {
  const locale = useLocale(), t = useT(messages);
  const captainT = useT(captainMessages);
  const captain = useCaptainContext();
  if (captainWorkspaceEnabled()) return <main className="mx-auto max-w-lg space-y-card-gap px-page-x pt-stack">
    <header className="flex min-h-12 items-center gap-stack">
      <div className="min-w-0 flex-1"><h1 className="text-h font-bold">{t('assessments')}</h1>
        {captain.data?.fullName && <p className="text-xs text-muted">{captainT('fromCoach', { name: captain.data.fullName })}</p>}
      </div>
      <CoachButton />
    </header>
    <PlayerAssessments layout="page" />
  </main>;
  return <main className="mx-auto max-w-lg space-y-stack px-page-x pt-card pb-[104px]">
    <header className="flex items-center gap-stack">
      <Link href={`/${locale}/player/progress`} aria-label={t('back')} className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised">
        <ChevronRight aria-hidden className="size-5 dir-icon" /></Link>
      <h1 className="text-xl font-black">{t('assessments')}</h1>
    </header>
    <PlayerAssessments layout="page" />
  </main>;
}
