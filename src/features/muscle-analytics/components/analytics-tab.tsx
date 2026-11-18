'use client';
import { useTimezone } from '@/core/timezone/client';

import { useCallback } from 'react';
import { useResource } from '@/core/resource';
import { useT } from '@/core/i18n/client';
import { localDate } from '@/lib/dates';
import { messages } from '../analytics/messages';
import { loadAnalytics } from '../data/load-analytics';
import { AnalyticsPanel } from './analytics-panel';
import { AnalyticsSkeleton } from './analytics-skeleton';
import { Button, clickableClass } from '@/ui/button';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { MuscleWeekSummary } from './muscle-week-summary';

export function AnalyticsTab({ playerId, self = false }: { playerId: string; self?: boolean }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const today = localDate(new Date(), timezone);
  const load = useCallback((signal: AbortSignal) => loadAnalytics(playerId, today, self, signal), [playerId, today, self]);
  const { data, status, retry } = useResource(`analytics:${playerId}:${today}:${self}`, load);
  const weeks = data?.weeks, readiness = data?.readiness ?? null;
  const failed = status === 'error';
  if (self && captainWorkspaceEnabled() && weeks && !failed) return <section className="glass space-y-stack rounded-card p-card">
    <MuscleWeekSummary week={weeks.at(-1)} />
    <details><summary className={`${clickableClass} flex min-h-12 items-center rounded-control text-sm font-bold`}>{t('title')}</summary>
      <AnalyticsPanel key={playerId} weeks={weeks} self readiness={readiness} />
    </details>
  </section>;
  return <section className="glass space-y-card-gap rounded-card p-card sm:p-section" aria-busy={!weeks && !failed}>
    <header className="space-y-inline"><h2 className="font-display text-xl font-bold">{t('title')}</h2>
      <p className="text-sm text-muted">{t('subtitle')}</p></header>
    {failed ? <div className="space-y-stack"><p role="alert" className="text-danger">{t('error')}</p>
      <Button type="button" variant="secondary" block={false} className={"min-h-12 px-page-x font-bold"}
        onClick={() => void retry()}>{t('retry')}</Button>
    </div> : weeks ? <AnalyticsPanel key={playerId} weeks={weeks} self={self} readiness={readiness} /> : <AnalyticsSkeleton />}
  </section>;
}
