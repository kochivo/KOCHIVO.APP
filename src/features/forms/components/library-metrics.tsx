import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';
import type { Metrics } from '../types';

export function LibraryMetrics({ metrics, locale }: { metrics: Metrics; locale: Locale }) {
  const m = messages[locale];
  const rate = metrics.sent ? metrics.answered / metrics.sent : null;
  const values = [metrics.active, metrics.sent, rate === null ? m.unanswered : `${Math.round(rate * 100)}%`,
    metrics.averageHours === null ? m.unanswered : metrics.averageHours.toFixed(1)];
  return <dl aria-label={m.period} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
    {[m.active, m.sent, m.rate, m.average].map((label, i) => <div key={label} className="glass-strong rounded-card p-4 sm:p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`mt-3 text-2xl font-bold sm:text-3xl ${i === 2 ? rate !== null && rate < .75 ? 'text-warn' : 'text-lime' : 'text-ink'}`}>{values[i]}</dd>
    </div>)}
  </dl>;
}
