import type { WorkoutSessionRow } from '@/core/offline';
import { saturdayWeek } from '@/lib/dates';

export interface WeekEntry {
  date: string;
  label: string;
  dayOfMonth: number;
  state: 'done' | 'today' | 'train' | 'rest';
}
const labels = ['سبت', 'حد', 'اتنين', 'تلات', 'أربع', 'خميس', 'جمعة'];

export function buildWeek(today: string, trainingDays: number[], sessions: WorkoutSessionRow[]): WeekEntry[] {
  return saturdayWeek(today).map((date, index) => {
    const label = labels[index];
    if (label === undefined) throw new Error('Week day label missing');
    const at = new Date(`${date}T12:00:00Z`);
    const done = sessions.some((session) => session.training_date === date && session.completed_at !== null);
    return {
      date, label, dayOfMonth: Number(date.slice(-2)),
      state: done ? 'done' : date === today ? 'today' :
        trainingDays.length === 0 || trainingDays.includes(at.getUTCDay()) ? 'train' : 'rest',
    };
  });
}
