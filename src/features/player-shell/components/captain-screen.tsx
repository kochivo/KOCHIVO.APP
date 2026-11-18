'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import type { ReactNode } from 'react';
import { localDb } from '@/core/offline/db';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { useCaptainContext } from '../hooks/use-my-captain';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { CaptainHeading } from './captain-heading';
import { CaptainProfileCard } from './captain-profile-card';
import { CaptainChat } from './captain-chat';
import css from './captain-chat.module.css';

export function CaptainScreen({ voiceNotes }: { voiceNotes?: ReactNode }) {
  const t = useT(messages);
  const v6 = captainWorkspaceEnabled();
  const { data, status, retry } = useCaptainContext();
  const playerId = v6 && data?.captainId ? localDb().userId : undefined;
  if (v6) return <main className={`${css.focus} ${css.chat} mx-auto flex max-w-lg flex-col gap-card-gap px-page-x pt-stack`}>
    {data && <CaptainHeading captain={data} />}
    {data?.captainId && playerId ? <CaptainChat key={data.captainId} playerId={playerId} captainId={data.captainId} /> :
      status === 'loading' ? <LoadingState role="status" variant="detail" /> :
        <ErrorState message={t('couldnTLoadYourCoach')} retryLabel={t('tryAgain')} onRetry={() => void retry()} />}
  </main>;
  return <main className="mx-auto max-w-lg space-y-card-gap px-page-x pt-section pb-32">
    <header><h1 className="text-2xl font-extrabold">{t('coach')}</h1></header>
    <CaptainProfileCard />{data && voiceNotes}
  </main>;
}
