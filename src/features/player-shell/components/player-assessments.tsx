'use client';
import { useCallback } from 'react';
import Link from 'next/link';
import { ClipboardCheck, ChevronLeft } from 'lucide-react';
import { KoForms } from '@/ui/icons/ko-forms';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { useResource } from '@/core/resource';
import { ErrorState, LoadingState } from '@/ui';
import { localDb } from '@/core/offline';
import { formatTimestampAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { loadPlayerAssessments, loadPlayerAssessmentHistory } from '../data/player-assessments';
import { messages as pageMessages } from '../pages-messages';
import { messages } from '../v6-messages';
import { buttonClass } from '@/ui/button';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { PlayerAssessmentsWorkspace } from './player-assessments-workspace';

export type AssessmentLayout = 'list' | 'page' | 'link' | 'home';

export function PlayerAssessments({ actionable = true, layout = 'list' }: { actionable?: boolean; layout?: AssessmentLayout }) {
  const t = useT(messages);
  const p = useT(pageMessages);
  const locale = useLocale();
  const timezone = useTimezone();
  const load = useCallback(async () => layout === 'page' ? loadPlayerAssessmentHistory() : { due: await loadPlayerAssessments(), past: [] }, [layout]);
  const result = useResource(`${layout === 'page' ? 'player-assessment-history' : 'player-assessments-page'}:${localDb().userId}`, load);
  const date = (at: string) => formatTimestampAr(at, { day: 'numeric', month: 'long', year: 'numeric' }, locale, timezone);
  if (layout === 'link') return <div className="space-y-stack"><Link href={`/${locale}/player/assessments`} prefetch={false} aria-busy={!result.data && result.status !== 'error'}
    className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-16 items-center gap-stack bg-surface p-card text-sm font-bold" })}>
    <KoForms aria-hidden className="size-5 text-muted" />{p('assessments')}
    {!!result.data?.due.length && <span aria-label={p('dueCount', { n: result.data.due.length })}
      className="ms-auto rounded-full bg-gold-2/10 px-stack py-inline font-numeric text-xs text-gold-2">{formatNumber(result.data.due.length, locale)}</span>}
    <ChevronLeft aria-hidden className="ms-auto size-4 shrink-0 text-muted dir-icon" />
  </Link>{result.status === 'error' && <ErrorState message={t('failed')} retryLabel={t('retry')} onRetry={() => void result.retry()} />}</div>;
  if (result.status === 'error') return <ErrorState message={t('failed')} retryLabel={t('retry')} onRetry={() => void result.retry()} />;
  if (!result.data) return <LoadingState role="status" variant="detail" />;
  const { due, past } = result.data;
  if (layout === 'page' && captainWorkspaceEnabled()) return <PlayerAssessmentsWorkspace actionable={actionable} due={due} past={past} />;
  if (layout === 'page') return <div className="space-y-stack">
    <section aria-labelledby="assessments-due" className="space-y-stack">
      <h2 id="assessments-due" className="text-xs text-faint">{p('due')}</h2>
      {!due.length ? <p className="rounded-[22px] border border-line-soft bg-surface p-card text-sm text-muted">{t('noAssessments')}</p> :
        <ul className="space-y-stack">{due.map((request, index) => <li key={request.id}
          className={`rounded-[22px] border border-gold-2/45 p-card ${index === 0 ? 'space-y-stack bg-gold-2/10' : 'flex items-center gap-stack bg-surface'}`}>
          <div className="flex min-w-0 flex-1 items-center gap-stack">
            {index === 0 && <KoForms aria-hidden className="size-6 shrink-0 text-gold-2" />}
            <div className="min-w-0"><h3 className={index === 0 ? 'text-md font-bold' : 'text-sm font-bold'}>{request.forms?.title}</h3>
              {request.due_at && <p className="mt-inline text-xs text-muted">{p('dueBy', { date: date(request.due_at) })}</p>}</div>
          </div>
          <Link href={`/${locale}/player/forms/${request.id}`} prefetch={false}
            className={buttonClass({ variant: (index === 0 && actionable) ? 'primary' : 'secondary', block: false, className: `flex min-h-12 items-center justify-center px-page-x text-sm font-extrabold ${index === 0 && actionable ? "w-full" : "shrink-0"} ` })}>
            {p(index === 0 ? 'record' : 'recordShort')}</Link>
        </li>)}</ul>}
    </section>
    <section aria-labelledby="assessments-past" className="space-y-stack pt-inline">
      <h2 id="assessments-past" className="text-xs text-faint">{p('past')}</h2>
      {!past.length ? <p className="rounded-[22px] border border-line-soft bg-surface p-card text-sm text-muted">{p('noPast')}</p> :
        <ul className="divide-y divide-line-soft overflow-hidden rounded-[22px] border border-line-soft bg-surface">{past.map(request => <li key={request.id} className="space-y-stack px-page-x py-card">
          <div className="flex min-h-16 items-center gap-stack">
          <div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{request.forms?.title}</h3>
            <time dateTime={request.answered_at} className="mt-inline block text-xs text-muted">{date(request.answered_at)}</time></div>
          {request.headline && <span className="font-numeric text-sm font-extrabold">{formatNumber(request.headline.value, locale)}
            <span className="ms-inline text-micro font-normal text-muted">{locale === 'en' ? request.headline.labelEn : request.headline.labelAr}</span></span>}
          </div>
          {request.captain_reply?.trim() && <div className="recessed rounded-card p-card text-sm">
            {request.reviewed_at && <p className="text-xs text-muted">{p('reviewed')}</p>}
            <p className="whitespace-pre-wrap break-words text-ink">{request.captain_reply}</p>
          </div>}
        </li>)}</ul>}
    </section>
  </div>;
  return <section aria-label={t('assessments')} className="glass rounded-card border border-line-soft">
    {layout === 'home' && <h2 className="px-page-x pt-card font-bold">{p('assessments')}</h2>}
    {!due.length ? <p className="p-card text-xs text-faint">{t('noAssessments')}</p> :
      <ul className="divide-y divide-line-soft">{due.map((request, index) => <li key={request.id} className="flex min-h-16 items-center gap-stack p-card">
        <ClipboardCheck aria-hidden className="size-5 shrink-0 text-lime" />
        <div className="min-w-0 flex-1"><h2 className="text-sm">{request.forms?.title}</h2>
          {request.due_at && <p className="mt-inline text-xs text-faint">{t('due', { date: new Intl.DateTimeFormat(locale, {
            timeZone: timezone, day: 'numeric', month: 'long',
          }).format(new Date(request.due_at)) })}</p>}</div>
        {(layout !== 'home' || index === 0) && <Link href={layout === 'home' ? `/${locale}/player/assessments` : `/${locale}/player/forms/${request.id}`} prefetch={false}
          className={buttonClass({ variant: (layout !== 'home' && actionable && index === 0) ? 'primary' : 'secondary', block: false, className: `flex min-h-12 shrink-0 items-center px-page-x text-sm ${layout !== "home" && actionable && index === 0 ? "" : "text-muted"} ` })}>{layout === 'home' ? p('assessments') : t('answer')}</Link>}
      </li>)}</ul>}
  </section>;
}
