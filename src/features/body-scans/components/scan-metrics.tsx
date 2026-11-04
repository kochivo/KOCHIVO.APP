'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { metrics, latestDelta, totalDelta, trend } from '../deltas';
import type { Scan } from '../types';
import { messages } from '../messages';

export function ScanMetrics({ scans, total, target }: { scans: Scan[]; total: boolean; target: number | null }) {
  const t = useT(messages);
  const locale = useLocale();
  const deltas = total ? totalDelta(scans) : latestDelta(scans);
  const latest = scans.at(-1);
  return <div className="grid grid-cols-3 gap-2">
    {metrics.map(metric => {
      const delta = deltas[metric];
      const direction = trend(metric, delta, {
        previous: (total ? scans[0] : scans.at(-2))?.weight_kg ?? null,
        latest: latest?.weight_kg ?? null, target,
      });
      const Arrow = delta != null && delta < 0 ? ArrowDown : ArrowUp;
      const unit = t(metric === 'fat_pct' ? 'pct' : 'kg');
      return <div key={metric} className="glass-strong min-w-0 space-y-2 rounded-card p-3">
        <h3 className="text-sm text-muted">{t(metric)}</h3>
        <p className="text-2xl font-extrabold">{(total ? delta : latest?.[metric]) == null ? t('unknown') :
          formatNumber((total ? delta : latest?.[metric]) ?? 0, locale)} <span className="text-xs">{unit}</span></p>
        {delta == null ? <p className="text-xs text-muted">{t('noDelta')}</p> : <div className={direction === 'good' ? 'text-lime' : 'text-muted'}>
          <p className="text-xs"><Arrow aria-hidden className="inline size-4" />{t('delta', {
            value: `${delta > 0 ? '+' : ''}${formatNumber(delta, locale)}`, unit, metric: t(metric),
          })}</p><p className="text-xs">{t(direction)}</p>
        </div>}
      </div>;
    })}
  </div>;
}
