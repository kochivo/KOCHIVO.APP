'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { weeklyWeekday } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { CardioCards, GlassCard } from '@/ui';
import type { DayPreview } from '../day-preview';
import { messages } from '../messages';
import { estimateMinutes } from './today-card';

const weekdays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;
const badges = { upcoming: 'upcomingWorkout', completed: 'completedWorkout', missed: 'notLogged', rest: 'previewRestDay' } as const;

export function DayPreviewCard({ day, status, date }: DayPreview & { date: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const rest = status === 'rest';
  const exercises = day?.exercises ?? [];
  const sets = exercises.reduce((total, exercise) => total + exercise.sets, 0);
  const minutes = estimateMinutes(exercises) + (day?.cardio ?? []).reduce((total, block) => total + block.minutes, 0);
  return <GlassCard level="featured" className="space-y-5 p-5">
    <div className="space-y-2">
      <p className="text-xs text-muted">{t(weekdays[weeklyWeekday(date)] ?? 'sat')}</p>
      {!rest && <span className="inline-flex rounded-chip border border-line px-3 py-1 text-sm text-muted">{t(badges[status])}</span>}
      <h2 className="text-3xl font-extrabold">{rest ? t('previewRestDay') : day ? starterText(day.title, locale) || t('workout') : t('notLogged')}</h2>
      {rest ? <p className="text-muted">{t('weeklyRest')}</p> : day && <p className="text-sm text-muted">
        {t('exerciseCount', { n: exercises.length, count: formatNumber(exercises.length, locale) })} · {t('setCount', { n: sets, count: formatNumber(sets, locale) })} · {t('minuteCount', { n: minutes, count: formatNumber(minutes, locale) })}
      </p>}
    </div>
    {!rest && day && <>
      {exercises.length > 0 ? <ul className="space-y-3">{exercises.map(exercise => <li key={exercise.id} className="flex items-center justify-between gap-3">
        <span>{locale === 'ar' ? exercise.name_ar || exercise.name_en : exercise.name_en}</span>
        <bdi className="text-sm text-muted">{t('previewPrescription', {
          sets: formatNumber(exercise.sets, locale), reps: exercise.reps_max != null && exercise.reps_max !== exercise.reps_min ?
            t('previewRepRange', { min: formatNumber(exercise.reps_min, locale), max: formatNumber(exercise.reps_max, locale) }) : formatNumber(exercise.reps_min, locale),
        })}</bdi>
      </li>)}</ul> : !day.cardio?.length && <p className="text-muted">{t('yourCoachIsPreparingTodaysExercises')}</p>}
      <CardioCards blocks={day.cardio ?? []} />
    </>}
  </GlassCard>;
}
