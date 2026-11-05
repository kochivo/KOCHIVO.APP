'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { GlassCard } from '@/ui';
import { monthChange } from '../finance';
import type { Revenue } from '../types';

export function FinanceSummary({ revenue }: { revenue: Revenue }) {
  const t = useT(messages);
  const locale = useLocale();
  const money = (amount: number) => t('amount', { amount: formatNumber(amount, locale) });
  const change = monthChange(revenue);
  return (
    <section aria-labelledby="finance-heading" className="space-y-3">
      <h2 id="finance-heading" className="text-xl font-bold">{t('finance')}</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <GlassCard level="featured" className="col-span-2 space-y-1 p-5 lg:col-span-1">
          <p className="text-sm text-muted">{t('thisMonth')}</p>
          <p className="font-display text-4xl font-extrabold text-ink">{money(revenue.thisMonth)}</p>
          {change !== null && <p dir="auto" className="text-xs text-muted">{t('change', { change: `${change > 0 ? '+' : ''}${formatNumber(change, locale)}` })}</p>}
        </GlassCard>
        <GlassCard level="strong" className="space-y-1 p-5">
          <p className="text-sm text-muted">{t('lastMonth')}</p>
          <p className="font-display text-2xl font-extrabold">{money(revenue.lastMonth)}</p>
        </GlassCard>
        <GlassCard level="strong" className="space-y-1 p-5">
          <p className="text-sm text-muted">{t('dues')}</p>
          <p className={`font-display text-2xl font-extrabold ${revenue.dues > 0 ? 'text-warn' : ''}`}>{money(revenue.dues)}</p>
          <p className="text-xs text-muted">{revenue.owing > 0
            ? t('owingPlayers', { n: revenue.owing, count: formatNumber(revenue.owing, locale) }) : t('noDues')}</p>
        </GlassCard>
      </div>
    </section>
  );
}
