'use client';

import { Moon } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

export function RestHero({ coachRest = false }: { coachRest?: boolean }) {
  const t = useT(messages);
  return <section className="glass-strong space-y-4 rounded-card p-6 text-center">
    <svg aria-hidden viewBox="0 0 120 120" className="mx-auto size-32 animate-pulse text-calm motion-reduce:animate-none">
      <circle cx="60" cy="60" r="55" fill="currentColor" opacity=".08" />
      <circle cx="60" cy="60" r="42" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="60" cy="60" r="30" fill="currentColor" opacity=".12" />
    </svg>
    <h1 className="flex items-center justify-center gap-2 text-2xl"><Moon aria-hidden className="size-6 text-calm" />{t('restTitle')}</h1>
    <p className="text-muted">{t(coachRest ? 'coachRest' : 'calmLine')}</p>
  </section>;
}
