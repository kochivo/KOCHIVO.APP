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
import { estimateMinutes } from './today-card';
import { formatNumber } from '@/lib/format';

export function NextTaskCard({ task, day }: { task: PlayerTask; day?: SnapshotDay }) {
  const t = useT(messages);
  const locale = useLocale();
  const view = taskPresentation(task);
  if (captainWorkspaceEnabled()) return <GlassCard level="strong" data-tour={view.workout ? 'player-workout' : undefined} className="space-y-3 border border-line-soft p-5">
    <p className="text-xs text-faint">{t(view.heading, { name: starterText(task.name ?? '', locale) })}</p>
    {view.workout && <h2 className="font-display text-[22px] font-semibold">{starterText(task.name ?? '', locale)}</h2>}
    <p className="text-[12.5px] text-muted">{view.workout && day ? t('v6WorkoutSummary', {
      exercises: formatNumber(day.exercises.length, locale),
      minutes: formatNumber(estimateMinutes(day.exercises) + (day.cardio ?? []).reduce((sum, block) => sum + block.minutes, 0), locale),
    }) : task.tomorrow ? t('taskTomorrow', { name: starterText(task.tomorrow, locale) }) :
      t(task.kind === 'waiting' ? 'taskWaitingContext' : task.kind === 'done' ? 'taskDoneContext' : 'taskContext')}</p>
    {task.href && view.action && <Link href={task.href} data-tour={view.workout ? 'workout-start' : undefined}
      className="flex min-h-12 items-center justify-center rounded-full bg-lime px-5 font-semibold text-on-lime">{t(view.action)}</Link>}
  </GlassCard>;
  return <GlassCard data-tour={task.kind === 'start' || task.kind === 'continue' ? 'player-workout' : undefined} level="strong" className="space-y-4 p-6">
    <h2 className="text-3xl font-extrabold">{t(`task.${task.kind}`, { name: starterText(task.name ?? '', locale) })}</h2>
    <p className="text-sm text-muted">{task.tomorrow ? t('taskTomorrow', { name: starterText(task.tomorrow, locale) }) :
      t(task.kind === 'waiting' ? 'taskWaitingContext' : task.kind === 'done' ? 'taskDoneContext' : 'taskContext')}</p>
    {task.href && <Link data-tour={task.kind === 'start' || task.kind === 'continue' ? 'workout-start' : undefined} href={task.href} className="flex min-h-14 items-center justify-center rounded-control bg-lime px-5 font-extrabold text-on-lime">
      {t('taskAction')}
    </Link>}
  </GlassCard>;
}
