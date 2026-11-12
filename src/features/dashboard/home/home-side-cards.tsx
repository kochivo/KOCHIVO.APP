import 'server-only';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import type { RosterPlayer } from '@/features/roster';
import { daysBetween, localDate } from '@/lib/dates';
import type { loadHomeFollowup } from '../data/home-followup';
import { homeMessages } from './messages';
import { HomePanelEntry } from './home-panel-entry';
import { homeAge } from './age';

export async function HomeSideCards({ ending, requests, now, timezone, joinRequests }: {
  ending: RosterPlayer[]; requests: Awaited<ReturnType<typeof loadHomeFollowup>>['requests']; now: Date; timezone: string; joinRequests?: ReactNode;
}) {
  const t = await getT(homeMessages);
  return <aside className="min-w-0 space-y-3">
    {ending.length > 0 && <section className="glass rounded-card border border-line-soft px-5 py-[18px]">
      <h2 className="mb-1.5 font-display text-base font-semibold">{t('ending')}</h2>
      <ul className="divide-y divide-line-soft">{ending.map(player => {
        const days = daysBetween(localDate(now, player.timezone ?? timezone), player.accessUntil);
        return <li key={player.playerId}><Link href="/captain/billing" className="flex min-h-12 items-center justify-between gap-3 py-2.5 text-[13px]">
          <span>{player.fullName}</span><span className="shrink-0 text-faint">{days === 0 ? t('endsToday') : days === 1 ? t('afterOne') : days === 2 ? t('afterTwo') : t('after', { n: days })}</span>
        </Link></li>;
      })}</ul>
    </section>}
    {requests.length > 0 && <section className="glass rounded-card border border-line-soft px-5 py-[18px]">
      <h2 className="mb-1.5 font-display text-base font-semibold">{t('join')}</h2>
      <ul className="divide-y divide-line-soft">{requests.map(request => <li key={request.id} className="flex min-h-16 items-center gap-3 text-[13px]">
        <div className="min-w-0 flex-1"><p className="break-words">{request.name}</p><p className="mt-1 text-[11.5px] text-faint">{homeAge(request.at, now, t)}</p></div>
        {joinRequests ? <HomePanelEntry id={`join-${request.id}`} title={t('join')} content={joinRequests}
          className="inline-flex min-h-12 shrink-0 items-center rounded-full border border-line px-3.5 text-[12.5px]">{t('view')}</HomePanelEntry>
          : <Link className="inline-flex min-h-12 shrink-0 items-center rounded-full border border-line px-3.5 text-[12.5px]" href="/captain/inbox">{t('view')}</Link>}
      </li>)}</ul>
    </section>}
  </aside>;
}
