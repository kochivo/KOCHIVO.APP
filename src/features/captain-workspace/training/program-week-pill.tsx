import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { daysBetween, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { messages } from './player-program-messages';

export function ProgramWeekPill({ startedOn, totalWeeks, today, locale }: {
  startedOn: string | null; totalWeeks: number | null; today: string; locale: Locale;
}) {
  if (!startedOn || totalWeeks === null || !Number.isInteger(totalWeeks) || totalWeeks < 1) return null;
  const elapsed = daysBetween(startedOn, today);
  if (!Number.isFinite(elapsed) || elapsed < 0) return null;
  if (localDate(new Date(`${startedOn}T12:00:00Z`), 'UTC') !== startedOn) return null;
  const current = Math.min(totalWeeks, Math.floor(elapsed / 7) + 1);
  return <span className="rounded-full bg-lime-soft px-3 py-1 text-xs text-lime">{createT(messages, locale)('week', {
    current: formatNumber(current, locale), total: formatNumber(totalWeeks, locale),
  })}</span>;
}
