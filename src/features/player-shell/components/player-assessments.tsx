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

export type AssessmentLayout = 'list' | 'page' | 'link' | 'home';

export function PlayerAssessments({ actionable = true, layout = 'list' }: { actionable?: boolean; layout?: AssessmentLayout }) {
  const t = useT(messages);
  const p = useT(pageMessages);
  const locale = useLocale();
  const timezone = useTimezone();
  const load = useCallback(async () => layout === 'page' ? loadPlayerAssessmentHistory() : { due: await loadPlayerAssessments(), past: [] }, [layout]);
  const result = useResource(`${layout === 'page' ? 'player-assessment-history' : 'player-assessments-page'}:${localDb().userId}`, load);
  const date = (at: string) => formatTimestampAr(at, { day: 'numeric', month: 'long', year: 'numeric' }, locale, timezone);
  if (layout === 'link') return <div className="space-y-3"><Link href={`/${locale}/player/assessments`} prefetch={false} aria-busy={!result.data && result.status !== 'error'}
    className="flex min-h-16 items-center gap-3 rounded-[22px] border border-line-soft bg-surface p-4 text-sm font-bold">
    <KoForms aria-hidden className="size-5 text-muted" />{p('assessments')}
    {!!result.data?.due.length && <span aria-label={p('dueCount', { n: result.data.due.length })}
      className="ms-auto rounded-full bg-gold-2/10 px-2.5 py-1 font-numeric text-xs text-gold-2">{formatNumber(result.data.due.length, locale)}</span>}
    <ChevronLeft aria-hidden className="ms-auto size-4 shrink-0 text-muted dir-icon" />
  </Link>{result.status === 'error' && <ErrorState message={t('failed')} retryLabel={t('retry')} onRetry={() => void result.retry()} />}</div>;
  if (result.status === 'error') return <ErrorState message={t('failed')} retryLabel={t('retry')} onRetry={() => void result.retry()} />;
  if (!result.data) return <LoadingState role="status" variant="detail" />;
  const { due, past } = result.data;
  if (layout === 'page') return <div className="space-y-3">
    <section aria-labelledby="assessments-due" className="space-y-3">
      <h2 id="assessments-due" className="text-xs text-faint">{p('due')}</h2>
      {!due.length ? <p className="rounded-[22px] border border-line-soft bg-surface p-4 text-sm text-muted">{t('noAssessments')}</p> :
        <ul className="space-y-3">{due.map((request, index) => <li key={request.id}
          className={`rounded-[22px] border border-gold-2/45 p-4 ${index === 0 ? 'space-y-3 bg-gold-2/10' : 'flex items-center gap-3 bg-surface'}`}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {index === 0 && <KoForms aria-hidden className="size-6 shrink-0 text-gold-2" />}
            <div className="min-w-0"><h3 className={index === 0 ? 'text-[15px] font-bold' : 'text-sm font-bold'}>{request.forms?.title}</h3>
              {request.due_at && <p className="mt-0.5 text-xs text-muted">{p('dueBy', { date: date(request.due_at) })}</p>}</div>
          </div>
          <Link href={`/${locale}/player/forms/${request.id}`} prefetch={false}
            className={`flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-extrabold ${index === 0 && actionable ? 'w-full bg-lime text-on-lime' : 'shrink-0 border border-line-soft'}`}>
            {p(index === 0 ? 'record' : 'recordShort')}</Link>
        </li>)}</ul>}
    </section>
    <section aria-labelledby="assessments-past" className="space-y-3 pt-1.5">
      <h2 id="assessments-past" className="text-xs text-faint">{p('past')}</h2>
      {!past.length ? <p className="rounded-[22px] border border-line-soft bg-surface p-4 text-sm text-muted">{p('noPast')}</p> :
        <ul className="divide-y divide-line-soft overflow-hidden rounded-[22px] border border-line-soft bg-surface">{past.map(request => <li key={request.id} className="flex min-h-16 items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{request.forms?.title}</h3>
            <time dateTime={request.answered_at} className="mt-0.5 block text-xs text-muted">{date(request.answered_at)}</time></div>
          {request.headline && <span className="font-numeric text-sm font-extrabold">{formatNumber(request.headline.value, locale)}
            <span className="ms-1 text-[11px] font-normal text-muted">{locale === 'en' ? request.headline.labelEn : request.headline.labelAr}</span></span>}
        </li>)}</ul>}
    </section>
  </div>;
  return <section aria-label={t('assessments')} className="glass rounded-card border border-line-soft">
    {layout === 'home' && <h2 className="px-5 pt-5 font-bold">{p('assessments')}</h2>}
    {!due.length ? <p className="p-5 text-xs text-faint">{t('noAssessments')}</p> :
      <ul className="divide-y divide-line-soft">{due.map((request, index) => <li key={request.id} className="flex min-h-16 items-center gap-3 p-5">
        <ClipboardCheck aria-hidden className="size-5 shrink-0 text-lime" />
        <div className="min-w-0 flex-1"><h2 className="text-sm">{request.forms?.title}</h2>
          {request.due_at && <p className="mt-1 text-xs text-faint">{t('due', { date: new Intl.DateTimeFormat(locale, {
            timeZone: timezone, day: 'numeric', month: 'long',
          }).format(new Date(request.due_at)) })}</p>}</div>
        <Link href={layout === 'home' ? `/${locale}/player/assessments` : `/${locale}/player/forms/${request.id}`} prefetch={false}
          className={`flex min-h-12 shrink-0 items-center rounded-full px-5 text-sm ${layout !== 'home' && actionable && index === 0 ? 'bg-lime text-on-lime' : 'border border-line-soft text-muted'}`}>{t('answer')}</Link>
      </li>)}</ul>}
  </section>;
}
