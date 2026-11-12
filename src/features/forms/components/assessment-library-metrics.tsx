import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { AssessmentLibraryData } from '../data/assessment-library';
import { messages } from '../assessments/messages';
import { formCopy } from '../form-copy';

export function AssessmentLibraryMetrics({ data, locale, style }: { data: AssessmentLibraryData; locale: Locale; style?: ArabicStyle }) {
  const t = createT(messages, locale, style), m = data.metrics, f = formCopy(locale, style);
  const values = [data.pending, data.answeredWeek, m.sent ? `${Math.round(m.answered / m.sent * 100)}%` : t('blank'),
    m.averageHours === null ? t('blank') : `${Math.round(m.averageHours * 10) / 10} ${t('hours')}`];
  return <details className="text-xs text-faint">
    <summary className="min-h-12 cursor-pointer py-3">{f.period}</summary>
    <dl className="glass rounded-card border border-line-soft px-5 py-[18px]">
      {(['pending', 'answeredWeek', 'rate', 'average'] as const).map((key, n) => <div key={key} className="flex min-h-12 items-center justify-between gap-3 border-b border-line-soft last:border-0">
        <dt>{t(key)}</dt><dd className="font-display font-extrabold tabular-nums text-ink">{values[n]}</dd>
      </div>)}
      <div className="flex min-h-12 items-center justify-between gap-3"><dt>{f.sent}</dt><dd className="font-display font-extrabold text-ink">{m.sent}</dd></div>
    </dl>
  </details>;
}
