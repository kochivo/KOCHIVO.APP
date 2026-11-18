'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { formatDateAr, localDate } from '@/lib/dates';
import { messages } from '../messages';

const CoachButton = dynamic(() => import('@/features/player-shell').then(module => module.CoachButton));

export function HomeHeader({ firstName, now, streak, rest }: { firstName?: string; now: Date; streak?: ReactNode; rest?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const timezone = useTimezone();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' }).format(now));
  const greeting = t(hour < 12 ? 'goodMorning' : 'goodEvening');
  const date = localDate(now, timezone);
  return <header className="flex min-h-12 items-center gap-inline">
    <Link href="/player/settings" aria-label={t('homeAccount')}
      className="press grid size-12 shrink-0 place-items-center rounded-full">
      <span aria-hidden className={`grid size-10 place-items-center rounded-full border-2 bg-surface-raised text-title font-extrabold text-ink ${rest ? 'border-info' : 'border-lime'}`}>
        {firstName?.trim().slice(0, 1) || t('streakInitial')}
      </span>
    </Link>
    <div className="min-w-0 flex-1">
      <h1 className="text-md leading-tight font-extrabold">{firstName ? t('homeGreeting', { greeting, name: firstName }) : greeting}</h1>
      <time dateTime={date} className="block text-xs text-faint">{formatDateAr(date, { weekday: 'long', day: 'numeric', month: 'long' }, locale)}</time>
    </div>
    {streak}
    <div data-home-coach className="min-h-12 min-w-12 shrink-0"><CoachButton /></div>
  </header>;
}
