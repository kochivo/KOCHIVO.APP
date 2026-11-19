'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { CircleCheck, Dumbbell, Moon, Timer } from 'lucide-react';
import type { SnapshotDay } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { KoPlay } from '@/ui/icons/ko-play';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { messages } from '../messages';
import { estimateMinutes, warmupDuration } from './today-card';
import { buttonClass } from '@/ui/button';

export function HomeHero({ day, rest, restAction, finished = false, doneToday = false, startedToday = false }: {
  day?: SnapshotDay; rest: boolean; restAction?: ReactNode; finished?: boolean; doneToday?: boolean; startedToday?: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  if (!rest && !day && finished) return <FinishedHero title={t('programFinished')} body={t('renewProgram')} />;
  if (!rest && !day) return null;
  const minutes = day ? estimateMinutes(day.exercises) + warmupDuration(day) +
    (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0) : 0;
  return <section data-tour="player-workout" aria-label={t(rest ? 'today' : 'v6WorkoutToday')}
    className={`glass-strong cut-corner relative isolate flex flex-col gap-stack rounded-card p-card ${rest ? 'border-info/30 bg-info-soft bg-linear-to-br from-info/15 to-transparent' : 'border-lime/20 bg-linear-to-br from-lime/15 to-transparent'}`}>
    {rest ? <Moon aria-hidden className="size-8 text-info" /> : day && <span aria-hidden
      className="engraved pointer-events-none absolute end-0 top-0 -z-10 text-stat-large-wide opacity-40">{formatNumber(day.position, locale)}</span>}
    <div className="flex flex-col pe-stack">
      {!rest && day && <p className="text-xs font-bold text-lime">
        {t('v6WorkoutToday')} · {t('homeDayNumber', { position: formatNumber(day.position, locale) })}
      </p>}
      <h2 className="text-h font-extrabold">
        {rest ? t('homeRest') : starterText(day?.title ?? '', locale) || t('v6WorkoutToday')}
      </h2>
    </div>
    {rest ? <>
      <p className="text-row text-muted">{t('homeRestBody')}</p>
      {restAction}
    </> : day && <>
      <div className="flex flex-wrap gap-stack text-xs text-muted">
        <span className="flex items-center gap-inline"><Dumbbell aria-hidden className="size-4" />
          {t('exerciseCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) })}</span>
        {minutes > 0 && <span className="flex items-center gap-inline"><Timer aria-hidden className="size-4" />
          {t('homeMinutes', { n: minutes, count: formatNumber(minutes, locale) })}</span>}
      </div>
      {(day.exercises.length > 0 || Boolean(day.warmup?.items.length)) && <div className="flex flex-wrap gap-inline">
        {day.exercises.slice(0, 3).map(exercise => <span key={exercise.id} className="tone-neutral rounded-md px-inline text-micro font-semibold">
          {locale === 'en' ? exercise.name_en || exercise.name_ar : exercise.name_ar}
        </span>)}
        {day.exercises.length > 3 && <bdi dir="ltr" className="tone-neutral rounded-md px-inline text-micro font-semibold">+{formatNumber(day.exercises.length - 3, locale)}</bdi>}
        {Boolean(day.warmup?.items.length) && <span className="tone-neutral rounded-md px-inline text-micro font-semibold">{t('homeWarmup')}</span>}
      </div>}
      {doneToday ? <Link href={`/player/workout/${day.id}`} className="press relative flex min-h-12 items-center gap-inline self-start rounded-full bg-lime-soft px-stack text-sm font-bold text-lime">
        <CircleCheck aria-hidden className="size-5" />{t('homeDoneToday')}
      </Link> : day.exercises.length > 0 && <Link data-tour="workout-start" href={`/player/workout/${day.id}`}
        className={buttonClass({ variant: 'primary', size: 'lg', block: true, className: 'mt-inline text-md' })}>
        <KoPlay aria-hidden className="size-5 text-on-lime! [&_*]:text-on-lime!" />{t(startedToday ? 'v6Continue' : 'homeStart')}
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
