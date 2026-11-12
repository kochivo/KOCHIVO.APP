import Link from 'next/link';
import { getLocale, getT } from '@/core/i18n/server';
import { ageLabel } from '@/features/inbox';
import { formatNumber } from '@/lib/format';
import type { ActivityEvent } from '../data/workspace';
import { workspaceMessages } from '../workspace-messages';

export async function WorkspaceActivity({ events, now = new Date() }: { events: ActivityEvent[]; now?: Date }) {
  const [t, locale] = await Promise.all([getT(workspaceMessages), getLocale()]);
  return <section className="glass overflow-hidden rounded-card border border-line-soft">
    <h2 className="px-5 pb-1.5 pt-[18px] font-display text-[19px] font-semibold">{t('activity')}</h2>
    {!events.length ? <p className="p-5 text-sm text-faint">{t('emptyActivity')}</p> : <ul className="divide-y divide-line-soft">
      {events.map(event => <li key={`${event.kind}:${event.id}`}><Link href={`/captain/players/${event.playerId}`} className="flex min-h-16 items-center gap-3 px-[18px] py-3.5">
        <span aria-hidden className="glass grid size-[38px] shrink-0 place-items-center rounded-full border border-line text-xs">{event.name.slice(0, 1)}</span>
        <div className="min-w-0 text-sm"><p>{t(event.kind, { name: event.name, title: event.title || t('workoutTitle'), value: formatNumber(event.value ?? 0, locale) })}</p>
          <p className="mt-1 text-[11.5px] text-faint">{ageLabel(event.at, now, locale)}{event.sets == null ? '' : ` · ${t('sets', { count: formatNumber(event.sets, locale) })}`}</p></div>
      </Link></li>)}
    </ul>}
  </section>;
}
