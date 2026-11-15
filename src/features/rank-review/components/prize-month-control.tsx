import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { messages } from '../messages';
import { currentMonth, nextMonth } from '../months';
import { Button } from '@/ui/button';

export function PrizeMonthControl({ locale, now, month, onChange }: {
  locale: Locale; now: Date; month: string; onChange: (month: string) => void;
}) {
  const t = createT(messages, locale);
  const current = currentMonth(now);
  if (month !== current && month !== nextMonth(current)) return null;
  return <Button type="button" variant={'secondary'} block={false} className={"min-h-12 px-stack text-sm text-ink"}
    onClick={() => onChange(month === current ? nextMonth(month) : current)}>
    {t(month === current ? 'next' : 'thisMonth')}
  </Button>;
}
