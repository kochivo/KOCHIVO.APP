'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { DEFAULT_TIMEZONE, localDate, formatDateAr } from '@/lib/dates';

export function Greeting({ firstName, now }: { firstName?: string; now: Date }) {
  const t = useT(messages);
  const locale = useLocale();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: DEFAULT_TIMEZONE, hour: 'numeric', hourCycle: 'h23' }).format(now));
  const date = localDate(now);
  const weekday = formatDateAr(date, { weekday: 'long' }, locale);
  const dayMonth = formatDateAr(date, { day: 'numeric', month: 'long' }, locale);
  return <div className="space-y-1">
    <p className="text-start text-xs text-muted"><bdi>{`${weekday} · ${dayMonth}`}</bdi></p>
    <h1 className="text-2xl font-extrabold">{hour < 12 ? t('goodMorning') : t('goodEvening')}{firstName ? t('namedGreeting', { value0: firstName }) : ''}</h1>
  </div>;
}
