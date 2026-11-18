import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import { whatsappUrl } from '@/lib/whatsapp';
import type { homeMessages, homeV11Messages } from './messages';
import type { HomeTask } from './tasks';
import { buttonClass } from '@/ui/button';
import { LightDayEntry } from '@/features/captain-workspace';
import { PhoneHomeNeeds } from './phone-home-needs';
import type { PhoneHomeDebt } from './phone-home-needs';

export function HomeTaskListView({ t, locale, onSelect, old, tasks, count, contacts, today, phone, style, debts }: {
  t: Translator<typeof homeV11Messages>; locale: Locale; onSelect?: (href: string) => void; old: Translator<typeof homeMessages>;
  tasks: HomeTask[]; count: number; contacts: Map<string, string>; today?: string; phone?: boolean; style?: ArabicStyle; debts?: PhoneHomeDebt[];
}) {
  const desktop = <section className="glass min-w-0 overflow-hidden rounded-card">
    <header className="flex items-center gap-inline px-card pt-card pb-stack"><h2 className="text-md font-bold">{t('tasks')}</h2>
      <span className="tone-neutral rounded-md px-inline text-micro font-semibold">{formatNumber(count, locale)}</span>
      <Link prefetch={onSelect ? false : undefined} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? '#/captain/tasks' : '/captain/tasks'} className="ms-auto inline-flex min-h-12 items-center text-xs text-muted">{t('all')}</Link></header>
    {count === 0 ? <p className="px-inline py-page-y text-center text-sm text-muted">{t('emptyTasks')}</p> :
      <ul className="divide-y divide-line-soft">{tasks.slice(0, 5).map(task => {
        const phone = contacts.get(task.playerId);
        const href = (task.kind === 'absent' && phone ? whatsappUrl({ phone, text: old('reminder', { name: task.name }) }) : null) ?? task.href;
        return <li data-demo-target={onSelect && task.kind === 'assessment' ? 'review' : undefined} key={task.id} className="flex min-h-14 flex-wrap items-center gap-stack border-t border-line-soft px-card py-inline">
          <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-line bg-surface-raised text-sm font-bold">{task.name.slice(0, 1)}</span>
          <Link prefetch={onSelect ? false : undefined} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? `#${task.href}` : task.href} className="flex min-h-12 min-w-0 flex-1 flex-col justify-center"><b className="truncate text-sm font-semibold">{task.name}</b>
            <small className="truncate text-xs text-muted">{t(task.kind, { name: task.name, days: task.days ?? 0 })}{task.title ? ` · ${task.title}` : ''}</small></Link>
          {!onSelect && today && <LightDayEntry playerId={task.playerId} date={today} />}
          <span className={`hidden rounded-md px-inline text-micro font-semibold min-[1100px]:inline-flex ${task.urgent ? 'tone-danger' : 'tone-lime'}`}>{t(task.urgent ? 'urgent' : 'routine')}</span>
          <a onClick={onSelect ? event => { event.preventDefault(); onSelect(task.id); } : undefined} href={onSelect ? `#${href}` : href} className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-surface-raised px-stack text-xs" })}>{t(`action.${task.kind}`)}</a>
        </li>;
      })}</ul>}
  </section>;
  return phone ? <div><div className="hidden md:block">{desktop}</div>
    <PhoneHomeNeeds {...{ tasks, contacts, locale, today, style, debts }} /></div> : desktop;
}

