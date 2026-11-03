export const DEFAULT_TIMEZONE = 'Africa/Cairo';

/**
 * The calendar day a workout or meal belongs to, in the player's timezone (YYYY-MM-DD).
 * Lesson from the legacy audit (K-09/K-10): never derive "today" from UTC.
 */
export function localDate(at: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}
