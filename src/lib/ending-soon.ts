import { daysBetween } from './dates';

export const ENDING_SOON_DAYS = 7;

export function endingSoon(today: string, accessUntil: string) {
  const days = daysBetween(today, accessUntil);
  return days >= 0 && days <= ENDING_SOON_DAYS;
}
