'use client';

import { useT } from '@/core/i18n/client';
import { weeklyWeekday } from '@/lib/dates';
import { planAdherence } from '../../smart-notes';
import type { AdherenceLog } from '../../smart-notes';
import type { Meal } from '../../types';
import { messages } from './workspace/messages';

const weekdays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

export function WeekCard({ logs, today, meals, trainingDays, sent }: {
  logs: AdherenceLog[]; today: string; meals: Meal[]; trainingDays: number[]; sent: boolean;
}) {
  const t = useT(messages);
  const days = planAdherence(logs, today, meals, trainingDays);
  return <section className="glass rounded-card border border-line-soft px-page-x py-page-y">
    <h2 className="mb-stack font-display text-title font-semibold">{t('adherence')}</h2>
    <ul className="grid grid-cols-7 gap-inline">{days.map(day => {
      const status = day.completed > 0 ? day.expected > 0 && day.completed >= day.expected ? 'full' : 'partial' : 'none';
      const label = t(weekdays[weeklyWeekday(day.date)] ?? 'sat');
      return <li key={day.date} aria-label={t('day', { date: label, done: day.completed, total: day.expected })} data-adherence={status} className="text-center text-micro text-faint">
        {label}<span aria-hidden className={`mx-auto mt-inline block size-2.5 rounded-full border ${status === 'full' ? 'border-lime bg-lime' : status === 'partial' ? 'border-faint bg-faint' : 'border-line'}`} />
      </li>;
    })}</ul>
    <p className="mt-stack text-micro text-faint">{t('legend')}</p>
    {!sent && <p className="mt-inline text-xs text-faint">{t('unsent')}</p>}
  </section>;
}
