'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useCaptainContext } from '../hooks/use-my-captain';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { PlayerAssessments } from './player-assessments-entry';
import { CaptainQuestion } from './captain-question';
import { messages as v6Messages } from '../v6-messages';
import { messages as captainMessages } from '../captain-messages';
import { CaptainHeading } from './captain-heading';
import { CaptainPendingAssessment } from './captain-pending-assessment';
import { CaptainProfileCard, captainContact } from './captain-profile-card';

// Loaded on demand so the billing barrel stays out of the player route's first load.
const Renewal = dynamic(() => import('@/features/billing').then(module => module.RenewalEntry));

export function CaptainScreen({ voiceNotes }: { voiceNotes?: ReactNode }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const captainT = useT(captainMessages);
  const v6 = captainWorkspaceEnabled();
  const { data } = useCaptainContext();
  const { url } = captainContact(data);
  const profile = <CaptainProfileCard />;
  return <main className={v6 ? 'mx-auto max-w-lg space-y-3 px-[18px] pt-4 pb-52' : 'mx-auto max-w-lg space-y-5 px-5 pt-6 pb-32'}>
    {v6 && data ? <CaptainHeading captain={data} /> : <header><h1 className="text-2xl font-extrabold">{t('coach')}</h1></header>}
    {v6 && data ? <><CaptainPendingAssessment />{voiceNotes}<CaptainQuestion contactUrl={url} />
      <details className="rounded-[22px] border border-line-soft bg-surface p-4"><summary className="min-h-12 cursor-pointer text-sm text-muted">{captainT('assessments')}</summary><PlayerAssessments actionable={false} /></details>
      {!data.pending && !data.archivedAt && <Renewal />}
      <details className="group rounded-[22px] border border-line-soft bg-surface p-4 [&_a]:border [&_a]:border-line-soft [&_a]:bg-transparent [&_a]:text-muted"><summary className="flex min-h-12 cursor-pointer items-center text-sm text-muted">{v6t('profile')}<ChevronDown aria-hidden className="ms-auto size-4 shrink-0 transition-transform group-open:rotate-180" /></summary>{profile}</details>
    </> : <>{profile}{data && voiceNotes}</>}
  </main>;
}
