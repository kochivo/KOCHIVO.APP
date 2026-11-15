'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../dashboard/messages';
import { tierLabel } from '../format';
import type { AdminDashboard } from '../dashboard-types';

const colors = { entry: 'text-muted', champion: 'text-calm', legend: 'text-lime', empire: 'text-warn' };
export function PlanMix({ mix }: { mix: AdminDashboard['planMix'] }) {
  const t = useT(messages); const locale = useLocale();
  const total = mix.reduce((sum, item) => sum + item.captains, 0);
  return <section className="glass grid gap-card-gap rounded-card p-card" aria-labelledby="mix-title">
    <h2 id="mix-title" className="text-title font-semibold">{t('mix')}</h2>
    {total ? <div className="flex items-center gap-card-gap">
      <svg viewBox="0 0 42 42" className="size-28 shrink-0" aria-label={t('mix')} role="img">
        <circle cx="21" cy="21" r="15.9155" fill="none" strokeWidth="6" className="stroke-line" />
        {mix.map((item, index) => {
          const length = item.captains / total * 100;
          const start = 25 - mix.slice(0, index).reduce((sum, previous) => sum + previous.captains / total * 100, 0);
          return <circle key={item.tier} cx="21" cy="21" r="15.9155" fill="none" stroke="currentColor" strokeWidth="6"
            strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={start} className={colors[item.tier]} />;
        })}
      </svg>
      <dl className="min-w-0 flex-1 space-y-stack text-row">{mix.map(item => <div key={item.tier} className={`flex justify-between gap-inline ${colors[item.tier]}`}>
        <dt>{tierLabel(item.tier)}</dt><dd className="num font-bold text-ink">{formatNumber(item.captains, locale)}</dd>
      </div>)}</dl>
    </div> : <p className="text-sm text-muted">{t('noMix')}</p>}
  </section>;
}
