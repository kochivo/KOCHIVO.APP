import Link from 'next/link';
import { getLocale, getT } from '@/core/i18n/server';
import { ageLabel } from '@/features/inbox/server';
import { formatNumber } from '@/lib/format';
import type { ActivityEvent } from '../data/workspace';
import { workspaceMessages } from '../workspace-messages';

export async function WorkspaceActivity({ events, now = new Date() }: { events: ActivityEvent[]; now?: Date }) {
  const [t, locale] = await Promise.all([getT(workspaceMessages), getLocale()]);
  return <section className="glass overflow-hidden rounded-card border border-line-soft">
    <h2 className="px-page-x pb-inline pt-card font-display text-title font-semibold">{t('activity')}</h2>
    {!events.length ? <p className="p-card text-sm text-faint">{t('emptyActivity')}</p> : <ul className="divide-y divide-line-soft">
      {events.map(event => <li key={`${event.kind}:${event.id}`}><Link href={`/captain/players/${event.playerId}`} className="flex min-h-16 items-center gap-stack px-page-x py-card">
        <span aria-hidden className="glass grid size-[38px] shrink-0 place-items-center rounded-full border border-line text-xs">{event.name.slice(0, 1)}</span>
        <div className="min-w-0 text-sm"><p>{t(event.kind, { name: event.name, title: event.title || t('workoutTitle'), value: formatNumber(event.value ?? 0, locale) })}</p>
          <p className="mt-inline text-micro text-faint">{ageLabel(event.at, now, locale)}{event.sets == null ? '' : ` · ${t('sets', { n: event.sets, count: formatNumber(event.sets, locale) })}`}</p></div>
      </Link></li>)}
    </ul>}
  </section>;
}
