import Link from 'next/link';
import { CalendarClock, CheckCheck, Dumbbell, MessageCircle, Salad, Wallet, Clock } from 'lucide-react';
import { getLocale, getT } from '@/core/i18n/server';
import { formatDateAr } from '@/lib/dates';
import type { RosterPlayer } from '@/features/roster';
import type { WorkspaceCaptainTask } from '../next-task';
import { taskIsPrimary } from '../next-task';
import { workspaceMessages } from '../workspace-messages';
import { buttonClass } from '@/ui/button';

const icons = { review: MessageCircle, noProgram: Dumbbell, noMealPlan: Salad, renew: CalendarClock, dues: Wallet, late: Clock, done: CheckCheck, invite: CheckCheck };
export async function WorkspaceTasks({ tasks, players = [], lastPayments }: { tasks: WorkspaceCaptainTask[]; players?: RosterPlayer[]; lastPayments?: Map<string, string> }) {
  const [t, locale] = await Promise.all([getT(workspaceMessages), getLocale()]);
  return <section className="glass overflow-hidden rounded-card border border-line-soft">
    <h2 className="px-page-x pb-inline pt-card font-display text-title font-semibold">{t('today')}</h2>
    <ul className="divide-y divide-line-soft">{tasks.filter(task => task.kind !== 'invite').map((task, index) => {
      if (task.kind === 'invite') return null;
      const Icon = icons[task.kind];
      const lastPayment = task.playerId ? lastPayments?.get(task.playerId) : undefined;
      return <li key={`${task.kind}:${task.href}:${index}`} className="flex min-h-16 flex-wrap items-center gap-stack px-page-x py-card">
        <span className={`glass grid size-[38px] shrink-0 place-items-center rounded-xl ${task.kind === 'review' ? 'text-lime' : task.kind === 'late' ? 'text-danger' : 'text-warn'}`}><Icon className="size-5" aria-hidden /></span>
        <div className="min-w-0 flex-1 text-sm"><p>{t(task.kind === 'late' ? 'lateTask' : task.days === 0 ? 'endingTaskToday' : task.days !== undefined ? 'endingTask' : task.kind, { name: task.name ?? '', n: task.days ?? task.count ?? 0, count: task.days ?? task.count ?? 0 })}</p>
          <p className="mt-inline text-micro text-faint">{task.kind === 'review' && players.some(player => player.openTasks) ? players.filter(player => player.openTasks).map(player => player.fullName).join(' · ') :
            task.kind === 'renew' && lastPayment ? t('lastPayment', { date: formatDateAr(lastPayment, { day: 'numeric', month: 'long' }, locale) }) :
            task.kind === 'late' && task.lastTrainingDate ? t('lastWorkout', { date: formatDateAr(task.lastTrainingDate, { day: 'numeric', month: 'long' }, locale) }) : t(`hint.${task.kind}`)}</p></div>
        <Link href={task.href} className={buttonClass({ variant: (taskIsPrimary(index) && task.kind !== 'done') ? 'primary' : 'secondary', block: false, className: `inline-flex min-h-12 items-center justify-center px-card text-xs ${taskIsPrimary(index) && task.kind !== "done" ? "font-semibold" : "text-ink"} ` })}>
          {t(`action.${task.kind}`)}</Link>
      </li>;
    })}</ul>
  </section>;
}
