'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatDateAr } from '@/lib/dates';
import type { activityWeek } from '../week';

export function PreviewWeek({ week, today }: { week: ReturnType<typeof activityWeek>; today: string }) {
  const t = useT(messages);
  const locale = useLocale();
  return <section className="space-y-3" aria-label={t('weekActivity')}>
    <h2 className="font-bold">{t('week')}</h2>
    <ol className="space-y-2">{week.map((day) => <li key={day.date}
      aria-current={day.date === today ? 'date' : undefined} className={`glass rounded-control p-3 ${day.date === today ? 'border-lime' : ''}`}>
      <time dateTime={day.date} className="text-sm font-bold">{formatDateAr(day.date, { weekday: 'short', day: 'numeric', month: 'short' }, locale)}</time>
      <p className="text-sm text-muted">{day.trained ? t('trained') : t('noTraining')} · {t('meals', { n: day.mealsEaten, count: formatNumber(day.mealsEaten, locale) })}</p>
    </li>)}</ol>
  </section>;
}
