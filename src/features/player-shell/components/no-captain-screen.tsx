'use client';
import { useT } from '@/core/i18n/client';
import type { ReactNode } from 'react';
import { messages } from '../messages';

export function NoCaptainScreen({ onRetry, signOut }: { onRetry: () => void; signOut: ReactNode }) {
  const t = useT(messages);
  return <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-5 px-6 py-12 text-start">
    <h1 className="text-2xl font-extrabold">{t('youReNotWorkingWithA')}</h1>
    <p className="text-muted">{t('openCoachInvite')}</p>
    {signOut}
    <button type="button" className="min-h-12 rounded-control border border-line px-4 font-bold" onClick={onRetry}>{t('tryAgain')}</button>
  </main>;
}
