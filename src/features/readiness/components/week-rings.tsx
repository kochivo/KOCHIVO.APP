'use client';

import { Dumbbell, Moon } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatDateAr, saturdayWeek } from '@/lib/dates';
import type { CoachReadiness } from '../data/coach-readiness';
import { readinessScore } from '../score';
import { messages } from '../messages';
import { ScoreRings } from './score-rings';

export function WeekRings({ today, data }: { today: string; data: CoachReadiness }) {
  const t = useT(messages);
  const locale = useLocale();
  return <section aria-label={t('week')} className="glass rounded-card p-stack">
    <div className="grid grid-cols-7 gap-inline">{saturdayWeek(today).map(date => {
      const row = data.checks.find(row => row.log_date === date);
      const decision = data.decisions.find(row => row.decision_date === date)?.decision;
      const training = data.sessions.some(session => session.training_date === date) ||
        (decision !== 'rest' && data.training.includes(date));
      const Icon = training ? Dumbbell : Moon;
      const score = readinessScore({ sleepHours: row?.sleep_hours, soreness: row?.soreness, waterMl: row?.water_ml, waterGoalMl: data.goal });
      return <div key={date} className="flex min-w-0 flex-col items-center gap-inline text-center text-xs">
        <p className="text-muted">{formatDateAr(date, { weekday: 'short' }, locale)}</p>
        <ScoreRings result={score} small />
        <Icon role="img" aria-label={t(training ? 'training' : 'restDay')} className="size-4 text-muted" />
        <p className="text-water">{t('waterValue', { value: (row?.water_ml ?? 0) / 1000 })}</p>
      </div>;
    })}</div>
  </section>;
}
