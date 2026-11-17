'use client';

import type { SnapshotDay } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { ChevronLeft } from 'lucide-react';
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
    <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-surface-raised">
      <span className="text-micro text-muted">{t('homeTomorrow')}</span>
      <b className="font-[family-name:var(--font-manrope)] text-base">{formatNumber(Number(date.slice(-2)), locale)}</b>
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-inline">
      <b className="text-md">{rest ? t('homeTomorrowRest') : day ? starterText(day.title, locale) : t('homeNoTomorrow')}</b>
      {!rest && day && <span className="text-xs text-muted">{t('exerciseCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) })}
        {minutes > 0 && <> · {t('homeMinutes', { count: formatNumber(minutes, locale) })}</>}
      </span>}
    </span>
    {!rest && day && <ChevronLeft aria-hidden className="size-[18px] text-muted ltr:rotate-180" />}
  </>;
  const className = 'glass flex min-h-12 items-center gap-stack rounded-card px-card py-stack text-ink';
  return !rest && day ? <a href="#home-day-preview" onClick={() => onPreview(date)} className={className}>{content}</a>
    : <div className={className}>{content}</div>;
}
