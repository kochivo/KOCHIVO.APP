'use client';

import Link from 'next/link';
import { Moon } from 'lucide-react';
import type { SnapshotDay } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { KoPlay } from '@/ui/icons/ko-play';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { messages } from '../messages';
import { estimateMinutes, warmupDuration } from './today-card';
import { buttonClass } from '@/ui/button';

export function HomeHero({ day, rest, streak, finished = false }: { day?: SnapshotDay; rest: boolean; streak?: number; finished?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  if (!rest && !day && finished) return <FinishedHero title={t('programFinished')} body={t('renewProgram')} />;
  if (!rest && !day) return null;
  const minutes = day ? estimateMinutes(day.exercises) + warmupDuration(day) +
    (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0) : 0;
  return <section data-tour="player-workout" aria-label={t(rest ? 'today' : 'v6WorkoutToday')}
    className={`relative flex flex-col overflow-hidden rounded-[28px] border border-line-soft bg-surface p-card ${rest ? 'gap-stack' : 'gap-card-gap'}`}>
    <div aria-hidden className="absolute -end-[30px] -top-10 h-[220px] w-[90px] -skew-x-[18deg] bg-lime opacity-90" />
    {rest && <Moon aria-hidden className="absolute end-6 top-[22px] size-11 text-on-lime" />}
    <div className="relative flex flex-col gap-inline pe-20">
      <span className="text-row text-muted">{t(rest ? 'today' : 'v6WorkoutToday')}</span>
      <h2 className="text-stat! leading-[1.15] font-black! [font-family:inherit]!">
        {rest ? t('homeRest') : starterText(day?.title ?? '', locale) || t('v6WorkoutToday')}
      </h2>
    </div>
    {rest ? <>
      <p className="relative text-sm leading-[1.7] text-ink">{t('homeRestBody')}</p>
      {streak !== undefined && <span className="relative flex h-8 items-center self-start rounded-full bg-lime-soft px-stack text-xs font-bold text-lime">
        {t('homeRestStreak', { count: formatNumber(streak, locale) })}
      </span>}
    </> : day && <>
      <div className="relative flex flex-wrap gap-inline">
        <span className="flex h-8 items-center rounded-full bg-surface-raised px-stack text-xs">{t('exerciseCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) })}</span>
        {minutes > 0 && <span className="flex h-8 items-center rounded-full bg-surface-raised px-stack text-xs">{t('homeMinutes', { count: formatNumber(minutes, locale) })}</span>}
        {Boolean(day.warmup?.items.length) && <span className="flex h-8 items-center rounded-full bg-surface-raised px-stack text-xs">{t('homeWarmup')}</span>}
      </div>
      {day.exercises.length > 0 && <Link data-tour="workout-start" href={`/player/workout/${day.id}`}
        className={buttonClass({ variant: 'primary', block: false, className: "relative flex h-[62px] items-center justify-center gap-stack text-title font-black" })}>
        <KoPlay aria-hidden className="size-[22px] text-on-lime! [&_*]:text-on-lime!" />{t('homeStart')}
      </Link>}
    </>}
  </section>;
}

// The program ran out: same hero frame, no action, the captain renews it.
function FinishedHero({ title, body }: { title: string; body: string }) {
  return <section aria-label={title} className="relative flex flex-col gap-stack overflow-hidden rounded-[28px] border border-line-soft bg-surface p-card">
    <div aria-hidden className="absolute -end-[30px] -top-10 h-[220px] w-[90px] -skew-x-[18deg] bg-lime opacity-90" />
    <h2 className="relative pe-20 text-stat! leading-[1.15] font-black! [font-family:inherit]!">{title}</h2>
    <p className="relative pe-20 text-sm leading-[1.7] text-ink">{body}</p>
  </section>;
}
