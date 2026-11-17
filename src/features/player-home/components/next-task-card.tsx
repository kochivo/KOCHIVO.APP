'use client';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui';
import { starterText } from '@/lib/starter-text';
import type { PlayerTask } from '../next-task';
import { messages } from '../messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { taskPresentation } from '../v6-summary';
import type { SnapshotDay } from '@/core/offline';
import { estimateMinutes, warmupDuration } from './today-card';
import { formatNumber } from '@/lib/format';
import { messages as warmupMessages } from '../warmup/messages';
import { buttonClass } from '@/ui/button';

export function NextTaskCard({ task, day }: { task: PlayerTask; day?: SnapshotDay }) {
  const t = useT(messages);
  const wt = useT(warmupMessages);
  const locale = useLocale();
  const view = taskPresentation(task);
  if (captainWorkspaceEnabled()) return <section className="glass space-y-stack rounded-card p-card">
    <p className="text-xs text-faint">{t(view.heading, { name: starterText(task.name ?? '', locale) })}</p>
    {view.workout && <h2 className="font-display text-h font-semibold">{starterText(task.name ?? '', locale)}</h2>}
    <p className="text-xs text-muted">{view.workout && day ? t('v6WorkoutSummary', {
      exercises: formatNumber(day.exercises.length, locale),
      minutes: formatNumber(estimateMinutes(day.exercises) + warmupDuration(day) + (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0), locale),
    }) : task.tomorrow ? t('taskTomorrow', { name: starterText(task.tomorrow, locale) }) :
      t(task.kind === 'waiting' ? 'taskWaitingContext' : task.kind === 'done' ? 'taskDoneContext' : 'taskContext')}</p>
    {view.workout && day && warmupDuration(day) > 0 && <p className="text-xs text-warn">{wt('time', { minutes: formatNumber(warmupDuration(day), locale) })}</p>}
    {task.href && view.action && <Link href={task.href}
      className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center justify-center px-page-x font-semibold text-ink" })}>{t(view.action)}</Link>}
  </section>;
  return <GlassCard data-tour={task.kind === 'start' || task.kind === 'continue' ? 'player-workout' : undefined} level="strong" className="space-y-card-gap p-section">
    <h2 className="text-3xl font-extrabold">{t(`task.${task.kind}`, { name: starterText(task.name ?? '', locale) })}</h2>
    <p className="text-sm text-muted">{task.tomorrow ? t('taskTomorrow', { name: starterText(task.tomorrow, locale) }) :
      t(task.kind === 'waiting' ? 'taskWaitingContext' : task.kind === 'done' ? 'taskDoneContext' : 'taskContext')}</p>
    {view.workout && day && warmupDuration(day) > 0 && <p className="text-xs text-warn">{wt('time', { minutes: formatNumber(warmupDuration(day), locale) })}</p>}
    {task.href && <Link data-tour={task.kind === 'start' || task.kind === 'continue' ? 'workout-start' : undefined} href={task.href} className={buttonClass({ variant: 'primary', block: false, className: "flex min-h-14 items-center justify-center px-page-x font-extrabold" })}>
      {t('taskAction')}
    </Link>}
  </GlassCard>;
}
