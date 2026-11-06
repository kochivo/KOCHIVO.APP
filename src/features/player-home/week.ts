import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Locale } from '@/core/i18n/locale';

import type { ProgramSnapshot, WorkoutSessionRow } from '@/core/offline';
import { saturdayWeek } from '@/lib/dates';
import { trainingDay } from './streak';

export interface WeekEntry {
  date: string;
  label: string;
  dayOfMonth: number;
  state: 'done' | 'today' | 'train' | 'rest';
}

export function buildWeek(today: string, trainingDays: number[], sessions: WorkoutSessionRow[], locale: Locale = 'ar', snapshot?: ProgramSnapshot): WeekEntry[] {
  const t = createT(messages, locale);
  const labels = [t('sat'), t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri')];

  return saturdayWeek(today).map((date, index) => {
    const label = labels[index];
    if (label === undefined) throw new Error('Week day label missing');
    const done = sessions.some((session) => session.training_date === date && session.completed_at !== null);
    const training = trainingDay(date, trainingDays, snapshot);
    return {
      date, label, dayOfMonth: Number(date.slice(-2)),
      state: done ? 'done' : date === today ? 'today' :
        training ? 'train' : 'rest',
    };
  });
}
