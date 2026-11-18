'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { formatDateAr, formatTimestampAr, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { buttonClass } from '@/ui/button';
import { KoForms } from '@/ui/icons/ko-forms';
import { StatStrip } from '@/ui/stat-strip';
import { messages } from '../captain-messages';
import type { PlayerAssessmentHistory } from '../data/player-assessments';
import { messages as pages } from '../pages-messages';
import { messages as status } from '../v6-messages';

export function PlayerAssessmentsWorkspace({ due, past, actionable }: PlayerAssessmentHistory & { actionable: boolean }) {
  const t = useT(messages), p = useT(pages), s = useT(status);
  const locale = useLocale(), timezone = useTimezone(), { now } = useCalendarClock();
  const month = now && localDate(now, timezone).slice(0, 7);
  const day = (stamp: string) => localDate(new Date(stamp), timezone);
  const nearest = due.find(request => request.due_at)?.due_at;
  const nextDue = nearest ? day(nearest) : undefined;
  const count = (n: number) => formatNumber(n, locale);
  const date = (stamp: string) => formatTimestampAr(stamp, { day: 'numeric', month: 'long', year: 'numeric' }, locale, timezone);
  const requestHref = (id: string) => `/${locale}/player/forms/${id}`;
  return <div className="space-y-card-gap">
    <StatStrip className="max-sm:grid-cols-3! [&>div]:px-inline [&>div>div]:justify-center [&>div>div>span]:whitespace-normal [&>div>p]:justify-center [&>div>p]:text-center"
      items={[
        { label: t('waiting'), value: count(due.length), tone: 'lime' },
        { label: t('doneMonth'), value: month ? count(past.filter(row => day(row.answered_at).startsWith(month)).length) : '–' },
        { label: t('nextDue'), value: count(nextDue ? due.filter(row => row.due_at && day(row.due_at) === nextDue).length : 0),
          note: nextDue && formatDateAr(nextDue, { month: 'short', day: 'numeric' }, locale) },
      ]} />
    <section aria-label={p('due')} className="space-y-stack">
      {!due.length ? <p className="glass rounded-card p-card text-sm text-muted">{s('noAssessments')}</p> :
        <ul className="space-y-stack">{due.map((request, index) => <li key={request.id} className="space-y-stack">
          <Link href={requestHref(request.id)} prefetch={false}
            className={`press flex min-h-14 items-center gap-stack rounded-card p-card ${index === 0 ? 'ko-strip' : 'glass'}`}>
            <KoForms aria-hidden className="size-6 shrink-0 text-lime" />
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-sm font-bold">{request.forms?.title ?? p('assessments')}</h3>
              {request.due_at && <p className="text-xs text-muted">{p('dueBy', { date: date(request.due_at) })}</p>}
            </div>
            {index > 0 && <ChevronLeft aria-hidden className="dir-icon size-4 shrink-0 text-muted" />}
          </Link>
          {index === 0 && actionable && <Link href={requestHref(request.id)} prefetch={false}
            className={buttonClass({ variant: 'primary', size: 'lg', block: true })}>{p('record')}</Link>}
        </li>)}</ul>}
    </section>
    <section aria-labelledby="workspace-assessment-history" className="space-y-stack">
      <h2 id="workspace-assessment-history" className="text-row font-bold">{p('past')}</h2>
      {!past.length ? <p className="glass rounded-card p-card text-sm text-muted">{p('noPast')}</p> :
        <ul className="space-y-stack">{past.map(request => <li key={request.id} className="glass overflow-hidden rounded-card">
          <Link href={requestHref(request.id)} prefetch={false} className="press flex min-h-14 items-center gap-stack px-card py-stack">
            <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-bold">{request.forms?.title ?? p('assessments')}</h3>
              <time dateTime={request.answered_at} className="block text-xs text-muted">{date(request.answered_at)}</time>
              {request.headline && <p className="text-xs text-muted">{count(request.headline.value)} <span>{locale === 'en' ? request.headline.labelEn : request.headline.labelAr}</span></p>}
            </div>
            <span className={`rounded-md px-inline text-micro ${request.reviewed_at ? 'tone-lime' : 'tone-neutral'}`}>
              {request.reviewed_at ? p('reviewed') : t('submitted')}
            </span>
            <ChevronLeft aria-hidden className="dir-icon size-4 shrink-0 text-muted" />
          </Link>
          {request.captain_reply?.trim() && <p className="recessed break-words whitespace-pre-wrap border-t border-line-soft px-card py-stack text-sm">{request.captain_reply}</p>}
        </li>)}</ul>}
    </section>
  </div>;
}
