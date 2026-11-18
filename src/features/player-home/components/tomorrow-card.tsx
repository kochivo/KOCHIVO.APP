'use client';

import type { SnapshotDay } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { ChevronLeft, Dumbbell, Moon } from 'lucide-react';
import { formatDateAr } from '@/lib/dates';
import { starterText } from '@/lib/starter-text';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { estimateMinutes, warmupDuration } from './today-card';

export function TomorrowCard({ day, date, rest, onPreview }: {
  day?: SnapshotDay; date: string; rest: boolean; onPreview: (date: string) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const minutes = day ? estimateMinutes(day.exercises) + warmupDuration(day) +
    (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0) : 0;
  const content = <>
    <span className="flex items-center justify-between gap-inline text-xs">
      <b>{t('homeTomorrow')}</b>
      <time dateTime={date} className="text-faint">{formatDateAr(date, { weekday: 'long' }, locale)}</time>
    </span>
    <span className="flex items-center gap-stack">
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-control bg-surface-raised text-muted">
        {rest ? <Moon className="size-5" /> : <Dumbbell className="size-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <b className="text-md">{rest ? t('homeTomorrowRest') : day ? starterText(day.title, locale) : t('homeNoTomorrow')}</b>
        {!rest && day && <span className="block text-xs text-muted">{t('exerciseCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) })}
          {minutes > 0 && <> · {t('homeMinutes', { count: formatNumber(minutes, locale) })}</>}
        </span>}
      </span>
      {!rest && day && <ChevronLeft aria-hidden className="size-4 shrink-0 text-muted ltr:rotate-180" />}
    </span>
  </>;
  const className = 'glass flex min-h-12 flex-col gap-stack rounded-card px-card py-stack text-ink';
  return !rest && day ? <a href="#home-day-preview" onClick={() => onPreview(date)} className={`press ${className}`}>{content}</a>
    : <div className={className}>{content}</div>;
}
