'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { messages } from '../messages';

export function HomeHeader({ firstName, now, bell }: { firstName?: string; now: Date; bell?: ReactNode }) {
  const t = useT(messages);
  const timezone = useTimezone();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' }).format(now));
  return <header className="flex items-center gap-stack pb-inline">
    <Link href="/player/settings" aria-label={t('homeAccount')}
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised text-title font-extrabold text-ink">
      {firstName?.slice(0, 1) || t('streakInitial')}
    </Link>
    <div className="flex min-w-0 flex-1 flex-col gap-inline">
      <span className="text-row text-muted">{t(hour < 12 ? 'goodMorning' : 'goodEvening')}</span>
      <h1 className="text-h font-extrabold! [font-family:inherit]">{firstName || t('pageTitle')}</h1>
    </div>
    {bell}
  </header>;
}
