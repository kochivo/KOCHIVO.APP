import Link from 'next/link';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { whatsappUrl } from '@/lib/whatsapp';
import { buttonClass } from '@/ui/button';
import { LightDayEntry } from '@/features/captain-workspace';
import { homeMessages, homeV11Messages } from './messages';
import { phoneHomeMessages } from './phone/messages';
import type { HomeTask } from './tasks';

export type PhoneHomeDebt = { playerId: string; name: string; amount: number };

export function PhoneHomeNeeds({ tasks, contacts, locale, today, style, debts = [] }: {
  tasks: HomeTask[]; contacts: Map<string, string>; locale: Locale; today?: string; style?: ArabicStyle; debts?: PhoneHomeDebt[];
}) {
  const t = createT(phoneHomeMessages, locale, style), home = createT(homeV11Messages, locale, style);
  const old = createT(homeMessages, locale, style);
  const rows = [...tasks.slice(0, 5), ...debts.slice(0, 1).map(debt => ({
    id: `dues:${debt.playerId}`, kind: 'dues' as const, playerId: debt.playerId, name: debt.name,
    href: '/captain/billing', title: t('balance', { amount: formatNumber(debt.amount, locale) }), urgent: true, days: undefined,
  }))];
  return <section className="space-y-stack md:hidden">
    <h2 className="text-row font-bold">{t('needs')}</h2>
    <div className="glass overflow-hidden rounded-card">
      {rows.length === 0 ? <p className="p-card text-sm text-muted">{home('emptyTasks')}</p> :
        <ul className="divide-y divide-line-soft">{rows.map(task => {
          const phone = contacts.get(task.playerId);
          const message = task.kind === 'absent' && phone ? whatsappUrl({ phone, text: old('reminder', { name: task.name }) }) : null;
          const action = task.kind === 'absent' ? t('message')
            : task.kind === 'checkin' ? t('reply') : task.kind === 'dues' ? t('recordPayment') : home(`action.${task.kind}`);
          const description = task.kind === 'absent' ? t('absence', { n: task.days ?? 0, days: formatNumber(task.days ?? 0, locale) })
            : task.title || home(task.kind, { name: task.name, days: task.days ?? 0 });
          const tone = task.kind === 'absent' ? 'border-danger' : task.kind === 'receipt' || task.kind === 'dues' ? 'border-warn' : 'border-info';
          const href = task.kind === 'absent' ? message ?? `/captain/players/${task.playerId}/chat`
            : task.href === '/captain/tasks' ? `${task.href}#${encodeURIComponent(task.id)}` : task.href;
          return <li key={task.id} className="flex min-h-16 items-center gap-stack px-card py-inline">
            <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full border-2 bg-surface-raised text-md font-bold ${tone}`}>{task.name.slice(0, 1)}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{task.name}</p>
              <p className="truncate text-xs text-muted">{description}</p>
              {today && <LightDayEntry playerId={task.playerId} date={today} />}</div>
            <Link href={href} className={buttonClass({ variant: 'secondary', block: false,
              className: 'shrink-0 px-stack text-xs' })}>{action}</Link>
          </li>;
        })}</ul>}
    </div>
  </section>;
}
