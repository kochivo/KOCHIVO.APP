'use client';
import type { ReactNode } from 'react';
import { useLocalUser } from '@/core/offline/use-local-user';
import { useT } from '@/core/i18n/client';
import { LoadingState, ErrorState } from '@/ui';
import { messages } from '../messages';

export function LocalUserBoundary({ children }: { children: ReactNode }) {
  const state = useLocalUser();
  const t = useT(messages);
  if (state === 'loading') return <LoadingState />;
  if (state === 'error') return <ErrorState message={t('couldnTLoadYourCoach')} retryLabel={t('tryAgain')}
    onRetry={() => window.location.reload()} />;
  return children;
}
