'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { formatDateAr, localDate } from '@/lib/dates';
import { messages } from '../messages';

export function HomeHeader({ firstName, now, bell, rest }: { firstName?: string; now: Date; bell?: ReactNode; rest?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const timezone = useTimezone();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' }).format(now));
  const greeting = t(hour < 12 ? 'goodMorning' : 'goodEvening');
  const date = localDate(now, timezone);
  return <header className="flex items-center gap-stack">
    <div className="min-w-0 flex-1">
      <h1 className="text-h leading-tight font-extrabold">{rest ? t('homeRest') : firstName ? t('homeGreeting', { greeting, name: firstName }) : greeting}</h1>
      <time dateTime={date} className="block text-xs text-faint">{formatDateAr(date, { weekday: 'long', day: 'numeric', month: 'long' }, locale)}</time>
    </div>
    <Link href="/player/settings" aria-label={t('homeAccount')}
      className="press flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-lime bg-surface-raised text-title font-extrabold text-ink">
      {firstName?.slice(0, 1) || t('streakInitial')}
    </Link>
    {bell}
  </header>;
}
