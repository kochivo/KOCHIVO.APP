'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import Link from 'next/link';

export function DonePanel() {
  const t = useT(messages);
  return <section className="glass-strong space-y-5 rounded-card p-8 text-center">
    <h1 className="text-3xl font-extrabold">{t('workoutComplete')}</h1>
    <p className="text-muted">{t('savedOnYourPhoneYourCoachWill')}</p>
    <Link href="/player" className="glass inline-flex min-h-12 items-center rounded-control px-5">{t('backToHome')}</Link>
  </section>;
}
