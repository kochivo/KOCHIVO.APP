'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import type { ReactNode } from 'react';
import { localDb } from '@/core/offline/db';
import { PlayerChat } from '@/features/chat';
import { ErrorState } from '@/ui/error-state';
import { useCaptainContext } from '../hooks/use-my-captain';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { CaptainHeading } from './captain-heading';
import { CaptainPendingAssessment } from './captain-pending-assessment';
import { CaptainProfileCard } from './captain-profile-card';

export function CaptainScreen({ voiceNotes }: { voiceNotes?: ReactNode }) {
  const t = useT(messages);
  const v6 = captainWorkspaceEnabled();
  const { data, retry } = useCaptainContext();
  const playerId = v6 && data?.captainId ? localDb().userId : undefined;
  const profile = <CaptainProfileCard />;
  return <main className={v6 ? 'mx-auto max-w-lg space-y-stack px-page-x pt-card pb-52' : 'mx-auto max-w-lg space-y-card-gap px-page-x pt-section pb-32'}>
    {v6 && data ? <CaptainHeading captain={data} /> : <header><h1 className="text-2xl font-extrabold">{t('coach')}</h1></header>}
    {v6 && data ? <><CaptainPendingAssessment />
      {data.captainId && playerId ? <PlayerChat key={data.captainId} playerId={playerId} captainId={data.captainId} /> :
        <ErrorState message={t('couldnTLoadYourCoach')} retryLabel={t('tryAgain')} onRetry={() => void retry()} />}
    </> : <>{profile}{data && voiceNotes}</>}
  </main>;
}
