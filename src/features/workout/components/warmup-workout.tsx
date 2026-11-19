'use client';
import { Button } from '@/ui/button';
import { useLocale, useT } from '@/core/i18n/client';
import { emptyWarmup, warmupMinutes } from '@/features/programs';
import { formatNumber } from '@/lib/format';
import { weeklyWeekday } from '@/lib/dates';
import { starterText } from '@/lib/starter-text';
import { ErrorState, LoadingState } from '@/ui';
import type { useFocusSession } from '../hooks/use-focus-session';
import type { useWarmupSession } from '../hooks/use-warmup-session';
import { messages } from '../warmup/messages';
import { messages as workoutMessages } from '../messages';
import { WarmupCard } from './warmup-card';
import { WarmupPreview } from './warmup-preview';

const weekdays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

export function WarmupWorkout({ state, today, progress }: {
  state: ReturnType<typeof useFocusSession>; today: string; progress: ReturnType<typeof useWarmupSession>;
}) {
  const t = useT(messages);
  const wt = useT(workoutMessages);
  const locale = useLocale();
  const warmup = state.day?.warmup ?? emptyWarmup();
  const day = state.day;
  if (!day) return null;
  const minutes = Math.round(day.exercises.reduce((sum, exercise) => sum + exercise.sets * (40 + exercise.rest_seconds), 0) / 300) * 5
    + warmupMinutes(warmup) + (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0);
  return <div className="space-y-stack">
    <div className="space-y-inline">
      <p className="text-xs text-faint">{t('today', { weekday: t(weekdays[weeklyWeekday(state.session?.training_date ?? today)] ?? 'sat') })}</p>
      <h1 className="font-display text-h leading-[1.15]" style={{ fontWeight: 600 }}>{starterText(day.title, locale)}</h1>
      <p className="pb-inline text-xs text-muted">{t('summary', {
          minutes: t('summaryMinutes', { n: minutes, minutes: formatNumber(minutes, locale) }), count: t('summaryCount', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) }),
        })}</p>
    </div>
    <WarmupCard warmup={warmup} checked={progress.checked} disabled={progress.loading || progress.error} onToggle={progress.toggle} />
    <section className="glass-strong space-y-stack rounded-[22px] border border-line-soft px-page-x py-page-y">
      <span className="inline-flex rounded-full bg-lime-soft px-stack py-inline text-xs text-lime">{t('exercises', { step: formatNumber(2, locale) })}</span>
      <WarmupPreview state={state} />
    </section>
    <>
      {progress.loading && <LoadingState />}
      {progress.error && <ErrorState message={wt('couldntReadTheWorkoutOnYourPhone')} retryLabel={wt('tryAgain')} onRetry={() => window.location.reload()} />}
      <Button type="button" disabled={progress.loading || progress.error} onClick={() => {
        document.querySelector<HTMLInputElement>('#warmup-checklist input:not(:checked)')?.focus();
      }} variant={'primary'} block={false} className={"flex min-h-12 w-full items-center justify-center px-page-x font-semibold disabled:opacity-50"}>{t('continue')}</Button>
      <Button variant="secondary" type="button" disabled={progress.loading || progress.error} onClick={progress.skip}
        className="min-h-12 w-full rounded-full px-page-x text-sm text-muted">{t('skip')}</Button>
    </>
  </div>;
}
