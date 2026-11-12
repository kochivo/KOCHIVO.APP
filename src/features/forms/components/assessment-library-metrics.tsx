import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { AssessmentLibraryData } from '../data/assessment-library';
import { messages } from '../assessments/messages';

export function AssessmentLibraryMetrics({ data, locale }: { data: AssessmentLibraryData; locale: Locale }) {
  const t = createT(messages, locale), m = data.metrics;
  const values = [data.pending, data.answeredWeek, m.sent ? `${Math.round(m.answered / m.sent * 100)}%` : t('blank'),
    m.averageHours === null ? t('blank') : `${Math.round(m.averageHours * 10) / 10} ${t('hours')}`];
  return <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {(['pending', 'answeredWeek', 'rate', 'average'] as const).map((key, n) => <div key={key} className="glass-strong rounded-card border border-line-soft p-4">
      <dt className="text-xs text-muted">{t(key)}</dt><dd className="mt-2 font-display text-[30px] font-extrabold tabular-nums">{values[n]}</dd>
    </div>)}
  </dl>;
}
