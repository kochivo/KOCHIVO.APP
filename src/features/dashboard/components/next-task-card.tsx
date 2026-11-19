import Link from 'next/link';
import { getLocale, getT } from '@/core/i18n/server';
import { formatNumber } from '@/lib/format';
import { GlassCard } from '@/ui';
import type { CaptainTask } from '../next-task';
import { messages } from '../messages';
import { InviteButton } from '@/features/roster';
import { buttonClass } from '@/ui/button';

export async function NextTaskCard({ tasks, captainFirstName }: { tasks: CaptainTask[]; captainFirstName: string }) {
  const [t, locale] = await Promise.all([getT(messages), getLocale()]);
  const task = tasks[0];
  if (!task) return null;
  const title = (task: CaptainTask) => t(`task.${task.kind}`, { name: task.name ?? '', n: task.count ?? 0, count: formatNumber(task.count ?? 0, locale) });
  return <GlassCard data-tour="captain-home" level="featured" className="space-y-card-gap p-section">
    <h2 className="text-3xl font-extrabold lg:break-words">{title(task)}</h2>
    <p className="text-sm text-muted">{t(task.kind === 'done' ? 'taskDoneContext' : 'taskContext')}</p>
    {task.kind === 'invite' ? <InviteButton captainFirstName={captainFirstName} label={t('taskInviteAction')} className="min-h-14" /> : <Link href={task.href} className={buttonClass({ variant: (task.kind === 'done') ? 'secondary' : 'primary', block: false, className: task.kind === "done" ?
      "inline-flex min-h-12 items-center px-page-x font-bold" :
      "inline-flex min-h-14 items-center px-page-x font-extrabold" })}>
      {t(task.kind === 'done' ? 'allPlayers' : 'taskAction')}
    </Link>}
    {tasks[1] && <p className="text-xs text-muted">{t('taskThen', { task: title(tasks[1]) })}</p>}
  </GlassCard>;
}
