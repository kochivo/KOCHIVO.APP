'use client';
import { useT } from '@/core/i18n/client';
import type { ReactNode } from 'react';
import { messages } from '../messages';
import { Button } from '@/ui/button';

export function NoCaptainScreen({ onRetry, signOut }: { onRetry: () => void; signOut: ReactNode }) {
  const t = useT(messages);
  return <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-card-gap px-page-x py-section text-start">
    <h1 className="text-2xl font-extrabold">{t('youReNotWorkingWithA')}</h1>
    <p className="text-muted">{t('openCoachInvite')}</p>
    {signOut}
    <Button type="button" variant={'secondary'} block={false} className={"min-h-12 px-page-x font-bold"} onClick={onRetry}>{t('tryAgain')}</Button>
  </main>;
}
