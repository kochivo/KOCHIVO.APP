'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { paidCaptainShare } from '../kpis';

export function KpiRow({ data }: { data: { captains: number; players: number; paid_captains: number } }) {
  const t = useT(messages);
  const locale = useLocale();
  const stats = [
    [t('registered'), formatNumber(data.captains, locale)],
    [t('players'), formatNumber(data.players, locale)],
    [t('paidShare'), t('percentage', { n: formatNumber(Math.round(paidCaptainShare(data.paid_captains, data.captains)), locale) })],
  ] as const;
  return (
    <section aria-label={t('summary')} className="space-y-2">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map(([label, value]) => <div key={label} className="glass-strong rounded-card p-5">
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="mt-3 text-4xl font-extrabold tabular-nums">{value}</dd>
        </div>)}
      </dl>
    </section>
  );
}
