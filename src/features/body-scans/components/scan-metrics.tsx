'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { metrics, latestDelta, totalDelta, trend } from '../deltas';
import type { Scan } from '../types';
import { messages } from '../messages';
import { messages as v6Messages } from '../v6-messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { formatDateAr } from '@/lib/dates';

export function ScanMetrics({ scans, total, target, embedded = false }: { scans: Scan[]; total: boolean; target: number | null; embedded?: boolean }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const v6 = captainWorkspaceEnabled() && !total;
  const locale = useLocale();
  const deltas = total ? totalDelta(scans) : latestDelta(scans);
  const latest = scans.at(-1);
  return <div className={v6 && !embedded ? 'glass-strong space-y-stack rounded-card border border-line-soft p-card' : 'space-y-stack'}><div className="grid grid-cols-3 gap-inline">
    {metrics.map(metric => {
      const delta = deltas[metric];
      const direction = trend(metric, delta, {
        previous: (total ? scans[0] : scans.at(-2))?.weight_kg ?? null,
        latest: latest?.weight_kg ?? null, target,
      });
      const Arrow = delta != null && delta < 0 ? ArrowDown : ArrowUp;
      const unit = t(metric === 'fat_pct' ? 'pct' : 'kg');
      return <div key={metric} className={v6 ? 'min-w-0 space-y-inline' : 'glass-strong min-w-0 space-y-inline rounded-card p-inline sm:p-stack'}>
        <h3 className={v6 ? 'text-micro text-faint' : 'min-h-10 text-xs text-muted sm:text-sm'}>{t(metric)}</h3>
        <p className={v6 ? 'font-display text-lg font-extrabold tabular-nums' : 'text-2xl font-extrabold'}>{latest?.[metric] == null ? t('unknown') :
          formatNumber(latest[metric], locale)} <span className={v6 && metric !== 'fat_pct' ? 'sr-only' : v6 ? 'text-xs' : 'block text-xs font-normal text-muted'}>{unit}</span></p>
        {delta == null ? scans.length >= 2 && <p className="text-xs text-muted">{t('noDelta')}</p> : <div className={direction === 'good' ? 'text-lime' : 'text-muted'}>
          <p className="text-xs">{v6 ? `${delta > 0 ? '+' : ''}${formatNumber(delta, locale)}` : <><Arrow aria-hidden className="inline size-4" />{t('delta', {
            value: `${delta > 0 ? '+' : ''}${formatNumber(delta, locale)}`, unit, metric: t(metric),
          })}</>}</p><p className={v6 ? 'sr-only' : 'text-xs'}>{t(direction)}</p>
        </div>}
      </div>;
    })}
  </div>{v6 && latest && scans[0] && <p className="text-micro text-faint">{v6t('dates', {
    latest: formatDateAr(latest.scan_date, { day: 'numeric', month: 'long' }, locale),
    first: formatDateAr(scans[0].scan_date, { day: 'numeric', month: 'long' }, locale),
  })}</p>}{scans.length < 2 && <p className="text-xs text-muted">{t('noDelta')}</p>}</div>;
}
