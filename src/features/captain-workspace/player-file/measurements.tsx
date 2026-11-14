import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { v11Messages } from './v11-messages';

export interface FileMetric { key: 'weight' | 'bodyFat' | 'squat'; value: number; change: number | null }
export function Measurements({ metrics, locale }: { metrics: FileMetric[]; locale: Locale }) {
  const t = createT(v11Messages, locale);
  return <section className="glass rounded-card border border-line-soft p-3.5">
    <h2 className="mb-1 text-sm font-semibold">{t('measurements')}</h2>
    {metrics.length ? <dl>{metrics.map(metric => <div key={metric.key} className="flex min-h-10 items-center gap-3 text-sm">
      <dt className="text-muted">{t(metric.key)}</dt><dd className="ms-auto font-display font-bold tabular-nums">{formatNumber(metric.value, locale)}{metric.key === 'bodyFat' ? '%' : ''}</dd>
      {metric.change !== null && <dd className="rounded-full bg-lime-soft px-2 py-1 text-xs text-lime"><bdi>{metric.change < 0 ? '−' : '+'}{formatNumber(Math.abs(metric.change), locale)}</bdi></dd>}
    </div>)}</dl> : <p className="mt-3 text-sm text-muted">{t('noMeasurements')}</p>}
  </section>;
}
