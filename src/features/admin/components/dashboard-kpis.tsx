'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../dashboard/messages';
import type { AdminDashboard } from '../dashboard-types';

export function DashboardKpis({ data }: { data: AdminDashboard }) {
  const t = useT(messages); const locale = useLocale();
  const keys = ['mrr', 'captains', 'paidCaptains', 'players', 'activeCaptains'] as const;
  return <dl className="grid grid-cols-2 gap-card-gap min-[720px]:grid-cols-3 min-[1100px]:grid-cols-5">
    {keys.map(key => {
      const trend = data[key]; const delta = trend.value - trend.previous;
      const signed = `${delta > 0 ? '+' : delta < 0 ? '-' : ''}${formatNumber(Math.abs(delta), locale)}`;
      return <div key={key} className="glass-strong grid gap-stack rounded-card p-card first:col-span-2 min-[720px]:first:col-span-1">
        <dt className="text-xs text-muted">{t(key === 'paidCaptains' ? 'paid' : key)}</dt>
        <dd className="num text-stat font-extrabold" dir="ltr">{formatNumber(trend.value, locale)}
          {key === 'paidCaptains' && <span className="ms-inline text-xs font-semibold text-muted">{t('percentage', {
            n: formatNumber(data.captains.value ? Math.round(trend.value / data.captains.value * 100) : 0, locale),
          })}</span>}
        </dd>
        <dd dir="ltr" className={`num text-start text-xs ${delta > 0 ? 'text-lime' : delta < 0 && key === 'activeCaptains' ? 'text-danger' : 'text-muted'}`}>
          {t('delta', { value: signed })}
        </dd>
      </div>;
    })}
  </dl>;
}
