import { localDate } from '@/lib/dates';

type Session = { training_date: string; completed_at: string | null };
type MealLog = { log_date: string; completed_at: string | null; deleted_at: string | null };

export function activityWeek(today: string, sessions: readonly Session[], mealLogs: readonly MealLog[]) {
  const anchor = new Date(`${today}T12:00:00Z`);
  const offset = (anchor.getUTCDay() + 1) % 7;
  return Array.from({ length: 7 }, (_, index) => {
    const at = new Date(anchor);
    at.setUTCDate(at.getUTCDate() - offset + index);
    const date = localDate(at);
    return { date,
      trained: sessions.some((session) => session.training_date === date && session.completed_at !== null),
      mealsEaten: mealLogs.filter((log) => log.log_date === date && log.completed_at !== null && !log.deleted_at).length,
    };
  });
}
