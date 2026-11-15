import 'server-only';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getLocale, getT } from '@/core/i18n/server';
import type { RosterPlayer } from '@/features/roster';
import { daysBetween, localDate } from '@/lib/dates';
import type { loadHomeFollowup } from '../data/home-followup';
import { homeMessages } from './messages';
import { HomePanelEntry } from './home-panel-entry';
import { homeAge } from './age';
import { joinPackageLabel } from './join-package-label';
import { buttonClass } from '@/ui/button';

export async function HomeSideCards({ ending, requests, now, timezone, joinRequests }: {
  ending: RosterPlayer[]; requests: Awaited<ReturnType<typeof loadHomeFollowup>>['requests']; now: Date; timezone: string; joinRequests?: ReactNode;
}) {
  const [t, locale] = await Promise.all([getT(homeMessages), getLocale()]);
  return <aside className="min-w-0 space-y-stack">
    {ending.length > 0 && <section className="glass rounded-card border border-line-soft px-page-x py-page-y">
      <h2 className="mb-inline font-display text-base font-semibold">{t('ending')}</h2>
      <ul className="divide-y divide-line-soft">{ending.map(player => {
        const days = daysBetween(localDate(now, player.timezone ?? timezone), player.accessUntil);
        return <li key={player.playerId}><Link href="/captain/billing" className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center justify-between gap-stack px-page-x py-stack text-row" })}>
          <span>{player.fullName}</span><span className="shrink-0 text-faint">{days === 0 ? t('endsToday') : days === 1 ? t('afterOne') : days === 2 ? t('afterTwo') : t('after', { n: days })}</span>
        </Link></li>;
      })}</ul>
    </section>}
    {requests.length > 0 && <section className="glass rounded-card border border-line-soft px-page-x py-page-y">
      <h2 className="mb-inline font-display text-base font-semibold">{t('join')}</h2>
      <ul className="divide-y divide-line-soft">{requests.map(request => {
        const label = joinPackageLabel(request.package, locale, t);
        return <li key={request.id} className="flex min-h-16 items-center gap-stack text-row">
          <div className="min-w-0 flex-1"><p className="break-words">{label ? t('packageName', { name: request.name, label }) : request.name}</p><p className="mt-inline text-micro text-faint">{homeAge(request.at, now, t)}</p></div>
          {joinRequests ? <HomePanelEntry id={`join-${request.id}`} title={t('join')} content={joinRequests}
            className="inline-flex min-h-12 shrink-0 items-center rounded-full border border-line px-card text-xs">{t('view')}</HomePanelEntry>
            : <Link className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 shrink-0 items-center px-card text-xs" })} href="/captain/inbox">{t('view')}</Link>}
        </li>;
      })}</ul>
    </section>}
  </aside>;
}
