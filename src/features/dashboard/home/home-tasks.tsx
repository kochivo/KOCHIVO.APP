import Link from 'next/link';
import { getLocale, getT } from '@/core/i18n/server';
import type { RosterPlayer } from '@/features/roster';
import { formatDateAr } from '@/lib/dates';
import { captainNextTasks } from '../next-task';
import { workspaceMessages } from '../workspace-messages';

export async function HomeTasks({ players, dues, today, mealPlanPlayers, lastPayments }: {
  players: RosterPlayer[]; dues: [string, number][]; today: string; mealPlanPlayers: string[]; lastPayments: [string, string][];
}) {
  const [t, locale] = await Promise.all([getT(workspaceMessages), getLocale()]);
  const tasks = captainNextTasks(players, new Map(dues), today, { mealPlanPlayers: new Set(mealPlanPlayers) }).filter(task => task.kind !== 'invite');
  return <section className="glass rounded-card border border-line-soft">
    <h2 className="px-5 pt-4 font-display text-[19px] font-semibold">{t('today')}</h2>
    {!tasks.length && <p className="p-5 text-sm text-faint">{t('done')}</p>}
    <ul className="divide-y divide-line-soft">{tasks.map((task, index) => {
      if (task.kind === 'invite') return null;
      const lastPayment = lastPayments.find(([id]) => id === task.playerId)?.[1];
      return <li key={`${task.kind}:${index}`} className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div><p className="text-sm">{t(task.kind === 'late' ? 'lateTask' : task.days !== undefined ? 'endingTask' : task.kind, { name: task.name ?? '', count: task.days ?? task.count ?? 0 })}</p>
          <p className="text-xs text-faint">{lastPayment ? t('lastPayment', { date: formatDateAr(lastPayment, { day: 'numeric', month: 'long' }, locale) }) : t(`hint.${task.kind}`)}</p></div>
        <Link className="inline-flex min-h-12 items-center rounded-full border border-line px-4 text-xs" href={task.href}>{t(`action.${task.kind}`)}</Link>
      </li>;
    })}</ul>
  </section>;
}
