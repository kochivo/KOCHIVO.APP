'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatDateAr } from '@/lib/dates';
import type { activityWeek } from '../week';

type FeedbackSession = { id: string; training_date: string; completed_at: string | null; session_rpe: number | null; player_note: string | null };

export function PreviewWeek({ week, today, sessions = [] }: {
  week: ReturnType<typeof activityWeek>; today: string; sessions?: readonly FeedbackSession[];
}) {
  const t = useT(messages);
  const locale = useLocale();
  return <section className="space-y-stack" aria-label={t('weekActivity')}>
    <h2 className="font-bold">{t('week')}</h2>
    <ol className="space-y-inline">{week.map((day) => <li key={day.date}
      aria-current={day.date === today ? 'date' : undefined} className={`glass rounded-control p-stack ${day.date === today ? 'border-lime' : ''}`}>
      <time dateTime={day.date} className="text-sm font-bold">{formatDateAr(day.date, { weekday: 'short', day: 'numeric', month: 'short' }, locale)}</time>
      <p className="text-sm text-muted">{day.trained ? t('trained') : t('noTraining')} · {t('meals', { n: day.mealsEaten, count: formatNumber(day.mealsEaten, locale) })}</p>
      {sessions.filter(session => session.training_date === day.date && session.completed_at &&
        (session.session_rpe != null || session.player_note)).map(session => <div key={session.id} className="mt-inline space-y-inline">
        {session.session_rpe != null && <span className="inline-block rounded-control border border-line px-inline py-inline text-xs">{t('sessionRpe', { n: formatNumber(session.session_rpe, locale) })}</span>}
        {session.player_note && <p className="whitespace-pre-wrap break-words text-sm">{session.player_note}</p>}
      </div>)}
    </li>)}</ol>
  </section>;
}
