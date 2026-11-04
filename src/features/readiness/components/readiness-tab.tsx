'use client';

import { useEffect, useState } from 'react';
import { Activity, Moon } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { EmptyState, ErrorState, LoadingState } from '@/ui';
import { fetchCoachReadiness } from '../data/coach-readiness';
import type { CoachReadiness } from '../data/coach-readiness';
import { readinessScore } from '../score';
import { messages } from '../messages';
import { ScoreRings } from './score-rings';
import { DecisionCard } from './decision-card';
import { WeekRings } from './week-rings';

export function ReadinessTab({ playerId, today }: { playerId: string; today: string }) {
  const t = useT(messages);
  const [data, setData] = useState<CoachReadiness | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void fetchCoachReadiness(playerId, today).then(value => { if (!cancelled) setData(value); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [playerId, today, retry]);
  if (error) return <ErrorState message={t('error')} retryLabel={t('retry')} onRetry={() => { setError(false); setRetry(value => value + 1); }} />;
  if (!data) return <LoadingState variant="cards" />;
  const row = data.checks.find(row => row.log_date === today);
  const result = readinessScore({ sleepHours: row?.sleep_hours, soreness: row?.soreness, waterMl: row?.water_ml, waterGoalMl: data.goal });
  const applied = data.decisions.find(row => row.decision_date === today)?.decision;
  return <section className="space-y-4">
    {!data.checks.some(row => row.sleep_hours !== null || row.soreness !== null) && <EmptyState icon={Activity} title={t('empty')} body={t('unanswered')} />}
    <ScoreRings result={result} />
    <div className="flex flex-wrap justify-center gap-4 text-sm">
      <span className="text-sleep">{t('sleepPart')}</span><span className="text-water">{t('water')}</span><span className="text-sore">{t('sorePart')}</span>
    </div>
    {result?.flags.lowSleep && <p role="alert" className="flex items-center gap-2 text-danger"><Moon aria-hidden className="size-5" />{t('lowSleep')}</p>}
    {result?.flags.highSoreness && <p role="alert" className="flex items-center gap-2 text-danger"><Activity aria-hidden className="size-5" />{t('highSoreness')}</p>}
    <DecisionCard playerId={playerId} score={result?.score ?? null} exercises={data.exercises} applied={applied}
      onApplied={decision => setData({ ...data, decisions: [...data.decisions.filter(row => row.decision_date !== today),
        { id: '', captain_id: '', player_id: playerId, decision_date: today, decision, created_at: '' }] })} />
    <WeekRings today={today} data={data} />
  </section>;
}
