'use client';

import Link from 'next/link';
import { CircleCheck, Moon } from 'lucide-react';
import type { SnapshotDay } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { KoPlay } from '@/ui/icons/ko-play';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { messages } from '../messages';
import { estimateMinutes, warmupDuration } from './today-card';
import { buttonClass } from '@/ui/button';

export function HomeHero({ day, rest, streak, finished = false, doneToday = false }: { day?: SnapshotDay; rest: boolean; streak?: number; finished?: boolean; doneToday?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  if (!rest && !day && finished) return <FinishedHero title={t('programFinished')} body={t('renewProgram')} />;
  if (!rest && !day) return null;
  const minutes = day ? estimateMinutes(day.exercises) + warmupDuration(day) +
    (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0) : 0;
  return <section data-tour="player-workout" aria-label={t(rest ? 'today' : 'v6WorkoutToday')}
    className={`glass flex flex-col gap-stack rounded-card p-card ${rest ? 'items-center py-section text-center' : 'cut-corner'}`}>
    {rest && <Moon aria-hidden className="size-9 text-lime" />}
    <div className="flex flex-col">
      {!rest && <div className="flex flex-wrap items-center justify-between gap-inline">
        <span className="text-xs font-bold text-lime">{t('v6WorkoutToday')}</span>
        {day && <span className="text-micro text-faint">{t('homeDayNumber', { position: formatNumber(day.position, locale) })}</span>}
      </div>}
      <h2 className="text-title font-extrabold">
        {rest ? t('homeRest') : starterText(day?.title ?? '', locale) || t('v6WorkoutToday')}
      </h2>
    </div>
    {rest ? <>
      <p className="text-row text-muted">{t('homeRestBody')}</p>
      {streak !== undefined && <span className="tone-lime rounded-md px-inline text-micro font-semibold">
        {t('homeRestStreak', { count: formatNumber(streak, locale) })}
      </span>}
    </> : day && <>
      <p className="text-xs text-muted">
        {t('exerciseCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) })}
        {minutes > 0 && <> · {t('homeMinutes', { count: formatNumber(minutes, locale) })}</>}
      </p>
      {(day.exercises.length > 0 || Boolean(day.warmup?.items.length)) && <div className="flex flex-wrap gap-inline">
        {day.exercises.slice(0, 3).map(exercise => <span key={exercise.id} className="tone-neutral rounded-md px-inline text-micro font-semibold">
          {locale === 'en' ? exercise.name_en || exercise.name_ar : exercise.name_ar}
        </span>)}
        {day.exercises.length > 3 && <bdi dir="ltr" className="tone-neutral rounded-md px-inline text-micro font-semibold">+{formatNumber(day.exercises.length - 3, locale)}</bdi>}
        {Boolean(day.warmup?.items.length) && <span className="tone-neutral rounded-md px-inline text-micro font-semibold">{t('homeWarmup')}</span>}
      </div>}
      {doneToday ? <Link href={`/player/workout/${day.id}`} className="relative flex min-h-12 items-center gap-inline self-start rounded-full bg-lime-soft px-stack text-sm font-bold text-lime">
        <CircleCheck aria-hidden className="size-5" />{t('homeDoneToday')}
      </Link> : day.exercises.length > 0 && <Link data-tour="workout-start" href={`/player/workout/${day.id}`}
        className={buttonClass({ variant: 'primary', size: 'lg', className: 'mt-inline text-md' })}>
        <KoPlay aria-hidden className="size-5 text-on-lime! [&_*]:text-on-lime!" />{t('homeStart')}
      </Link>}
    </>}
  </section>;
}

// The program ran out: same hero frame, no action, the captain renews it.
function FinishedHero({ title, body }: { title: string; body: string }) {
  return <section aria-label={title} className="glass cut-corner flex flex-col gap-stack rounded-card p-card">
    <h2 className="text-title font-extrabold">{title}</h2>
    <p className="text-row text-muted">{body}</p>
  </section>;
}
