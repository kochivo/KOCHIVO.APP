'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { loadTodayReadiness } from '@/features/readiness';
import { localDate } from '@/lib/dates';
import { messages } from '../analytics/messages';
import { fetchMuscleVolume } from '../data/muscle-volume';
import type { VolumeWeek } from '../data/muscle-volume';
import { AnalyticsPanel } from './analytics-panel';
import { AnalyticsSkeleton } from './analytics-skeleton';

export function AnalyticsTab({ playerId, self = false }: { playerId: string; self?: boolean }) {
  const t = useT(messages);
  const [weeks, setWeeks] = useState<VolumeWeek[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const today = localDate(new Date());
  const [readiness, setReadiness] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([fetchMuscleVolume(playerId, new Date()), loadTodayReadiness(playerId, today, self).catch(() => null)]).then(([data, score]) => {
      if (active) {
        setWeeks(data);
        setReadiness(score);
      }
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [playerId, attempt, today, self]);
  return <section className="glass-strong space-y-5 rounded-card p-5 sm:p-6" aria-busy={!weeks && !failed}>
    <header className="space-y-1"><h2 className="font-display text-xl font-bold">{t('title')}</h2>
      <p className="text-sm text-muted">{t('subtitle')}</p></header>
    {failed ? <div className="space-y-3"><p role="alert" className="text-danger">{t('error')}</p>
      <button type="button" className="min-h-12 rounded-control bg-lime px-5 font-bold text-on-lime"
        onClick={() => { setFailed(false); setWeeks(null); setAttempt(value => value + 1); }}>{t('retry')}</button>
    </div> : weeks ? <AnalyticsPanel key={playerId} weeks={weeks} self={self} readiness={readiness} /> : <AnalyticsSkeleton />}
  </section>;
}
