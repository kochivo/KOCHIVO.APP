'use client';

import { useCallback } from 'react';
import { useResource } from '@/core/resource';
import { Activity, Moon } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { EmptyState, ErrorState, LoadingState } from '@/ui';
import { loadReadiness } from '../data/load-readiness';
import { readinessScore } from '../score';
import { messages } from '../messages';
import { ScoreRings } from './score-rings';
import { DecisionCard } from './decision-card';
import { WeekRings } from './week-rings';

export function ReadinessTab({ playerId, today }: { playerId: string; today: string }) {
  const t = useT(messages);
  const load = useCallback((signal: AbortSignal) => loadReadiness(playerId, today, signal), [playerId, today]);
  const { data, status, retry, mutate } = useResource(`readiness:${playerId}:${today}`, load);
  if (status === 'error') return <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => void retry()} />;
  if (!data) return <LoadingState variant="cards" />;
  const row = data.checks.find(row => row.log_date === today);
  const result = readinessScore({ sleepHours: row?.sleep_hours, soreness: row?.soreness, waterMl: row?.water_ml, waterGoalMl: data.goal });
  const applied = data.decisions.find(row => row.decision_date === today)?.decision;
  return <section className="space-y-card-gap">
    {!data.checks.some(row => row.sleep_hours !== null || row.soreness !== null) && <EmptyState icon={Activity} title={t('empty')} body={t('unanswered')} />}
    <ScoreRings result={result} />
    <div className="flex flex-wrap justify-center gap-card-gap text-sm">
      <span className="text-sleep">{t('sleepPart')}</span><span className="text-water">{t('water')}</span><span className="text-sore">{t('sorePart')}</span>
    </div>
    {result?.flags.lowSleep && <p role="alert" className="flex items-center gap-inline text-danger"><Moon aria-hidden className="size-5" />{t('lowSleep')}</p>}
    {result?.flags.highSoreness && <p role="alert" className="flex items-center gap-inline text-danger"><Activity aria-hidden className="size-5" />{t('highSoreness')}</p>}
    <DecisionCard playerId={playerId} score={result?.score ?? null} exercises={data.exercises} applied={applied}
      onApplied={decision => { void mutate(current => ({ ...(current ?? data), decisions: [...(current ?? data).decisions.filter(row => row.decision_date !== today),
        { id: '', captain_id: '', player_id: playerId, decision_date: today, decision, created_at: '' }] }), async () => {}); }} />
    <WeekRings today={today} data={data} />
  </section>;
}
