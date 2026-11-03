import { saturdayWeek } from '@/lib/dates';

type Session = { training_date: string; completed_at: string | null };
type MealLog = { log_date: string; completed_at: string | null; deleted_at: string | null };

export function activityWeek(today: string, sessions: readonly Session[], mealLogs: readonly MealLog[]) {
  return saturdayWeek(today).map((date) => {
    return { date,
      trained: sessions.some((session) => session.training_date === date && session.completed_at !== null),
      mealsEaten: mealLogs.filter((log) => log.log_date === date && log.completed_at !== null && !log.deleted_at).length,
    };
  });
}
