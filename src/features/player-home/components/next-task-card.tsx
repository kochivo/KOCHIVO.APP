'use client';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui';
import { starterText } from '@/lib/starter-text';
import type { PlayerTask } from '../next-task';
import { messages } from '../messages';

export function NextTaskCard({ task }: { task: PlayerTask }) {
  const t = useT(messages);
  const locale = useLocale();
  return <GlassCard data-tour={task.kind === 'start' || task.kind === 'continue' ? 'player-workout' : undefined} level="strong" className="space-y-4 p-6">
    <h2 className="text-3xl font-extrabold">{t(`task.${task.kind}`, { name: starterText(task.name ?? '', locale) })}</h2>
    <p className="text-sm text-muted">{task.tomorrow ? t('taskTomorrow', { name: starterText(task.tomorrow, locale) }) :
      t(task.kind === 'done' ? 'taskDoneContext' : 'taskContext')}</p>
    {task.href && <Link data-tour={task.kind === 'start' || task.kind === 'continue' ? 'workout-start' : undefined} href={task.href} className="flex min-h-14 items-center justify-center rounded-control bg-lime px-5 font-extrabold text-on-lime">
      {t('taskAction')}
    </Link>}
  </GlassCard>;
}
