'use client';
import { useCallback } from 'react';
import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { useResource } from '@/core/resource';
import { ErrorState, LoadingState } from '@/ui';
import { localDb } from '@/core/offline';
import { loadPlayerAssessments } from '../data/player-assessments';
import { messages } from '../v6-messages';

export function PlayerAssessments({ actionable = true }: { actionable?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const timezone = useTimezone();
  const load = useCallback(() => loadPlayerAssessments(), []);
  const result = useResource(`player-assessments:${localDb().userId}`, load);
  if (result.status === 'error') return <ErrorState message={t('failed')} retryLabel={t('retry')} onRetry={() => void result.retry()} />;
  if (!result.data) return <LoadingState variant="detail" />;
  return <section aria-label={t('assessments')} className="glass rounded-card border border-line-soft">
    {!result.data.length ? <p className="p-5 text-xs text-faint">{t('noAssessments')}</p> :
      <ul className="divide-y divide-line-soft">{result.data.map((request, index) => <li key={request.id} className="flex min-h-16 items-center gap-3 p-5">
        <ClipboardCheck aria-hidden className="size-5 shrink-0 text-lime" />
        <div className="min-w-0 flex-1"><h2 className="text-sm">{request.forms?.title}</h2>
          {request.due_at && <p className="mt-1 text-xs text-faint">{t('due', { date: new Intl.DateTimeFormat(locale, {
            timeZone: timezone, day: 'numeric', month: 'long',
          }).format(new Date(request.due_at)) })}</p>}</div>
        <Link href={`/${locale}/player/forms/${request.id}`} prefetch={false}
          className={`flex min-h-12 shrink-0 items-center rounded-full px-5 text-sm ${actionable && index === 0 ? 'bg-lime text-on-lime' : 'border border-line-soft text-muted'}`}>{t('answer')}</Link>
      </li>)}</ul>}
  </section>;
}
