import type { WorkoutSessionRow } from '@/core/offline';
import { localDate } from '@/lib/dates';

export interface WeekEntry {
  date: string;
  label: string;
  dayOfMonth: number;
  state: 'done' | 'today' | 'train' | 'rest';
}
const labels = ['سبت', 'حد', 'اتنين', 'تلات', 'أربع', 'خميس', 'جمعة'];

export function buildWeek(today: string, trainingDays: number[], sessions: WorkoutSessionRow[]): WeekEntry[] {
  const anchor = new Date(`${today}T12:00:00Z`);
  const offset = (anchor.getUTCDay() + 1) % 7;
  return labels.map((label, index) => {
    const at = new Date(anchor);
    at.setUTCDate(at.getUTCDate() - offset + index);
    const date = localDate(at);
    const done = sessions.some((session) => session.training_date === date && session.completed_at !== null);
    return {
      date, label, dayOfMonth: Number(date.slice(-2)),
      state: done ? 'done' : date === today ? 'today' :
        trainingDays.length === 0 || trainingDays.includes(at.getUTCDay()) ? 'train' : 'rest',
    };
  });
}
