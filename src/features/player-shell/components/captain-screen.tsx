'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import type { ReactNode } from 'react';
import { useRef } from 'react';
import { localDb } from '@/core/offline/db';
import { PlayerChat } from '@/features/chat';
import { ErrorState } from '@/ui/error-state';
import { cn } from '@/lib/cn';
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
  const chat = useRef<HTMLDivElement>(null);
  const profile = <CaptainProfileCard />;
  return <main className={v6 ? 'mx-auto max-w-lg space-y-stack px-page-x pt-card' : 'mx-auto max-w-lg space-y-card-gap px-page-x pt-section pb-32'}>
    {v6 && data ? <CaptainHeading captain={data} onMessage={playerId ? () => chat.current?.querySelector<HTMLInputElement>('[data-chat-composer] input')?.focus() : undefined} /> :
      <header><h1 className="text-2xl font-extrabold">{t('coach')}</h1></header>}
    {v6 && data ? <><CaptainPendingAssessment />
      {data.captainId && playerId ? <div ref={chat} className={cn(
        // The shared thread also renders captain chat and voice notes. Scope the glass to player text.
        '[&_ol>li>div:has(>p)]:glass [&_ol>li>div:has(>p)]:rounded-card [&_ol>li>div:has(>p)]:text-row [&_ol>li>div:has(>p)]:text-ink',
        '[&_ol>.self-end>div:has(>p)]:bg-lime-soft [&_ol>.self-end>div:has(>p)]:border-lime/20',
        '[&_[data-chat-composer]]:bottom-[calc(var(--nav-height)+var(--safe-bottom)+var(--spacing-stack))]',
        '[&_[data-chat-composer]_input]:rounded-control',
      )}>
        <PlayerChat key={data.captainId} playerId={playerId} captainId={data.captainId} />
      </div> :
        <ErrorState message={t('couldnTLoadYourCoach')} retryLabel={t('tryAgain')} onRetry={() => void retry()} />}
    </> : <>{profile}{data && voiceNotes}</>}
  </main>;
}
