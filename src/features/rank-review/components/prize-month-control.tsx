import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import { currentMonth, nextMonth } from '../months';

export function PrizeMonthControl({ locale, now, month, onChange }: {
  locale: Locale; now: Date; month: string; onChange: (month: string) => void;
}) {
  const t = createT(messages, locale);
  const current = currentMonth(now);
  if (month !== current && month !== nextMonth(current)) return null;
  return <button type="button" className="glass min-h-12 rounded-control px-3 text-sm text-ink"
    onClick={() => onChange(month === current ? nextMonth(month) : current)}>
    {t(month === current ? 'next' : 'thisMonth')}
  </button>;
}
