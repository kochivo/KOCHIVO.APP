'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import type { CaptainRow } from '../types';

export function KpiRow({ rows, now, scope }: { rows: CaptainRow[]; now: string; scope?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const suspicious = rows.filter(row => {
    const age = Date.parse(now) - Date.parse(row.created_at);
    return !row.email_confirmed && row.active_players === 0 && age >= 0 && age < 86_400_000;
  }).length;
  const stats = [
    [t('registered'), rows.length],
    [t('paidPlans'), rows.filter(row => row.tier !== 'entry'
      && (!row.tier_ends_at || Date.parse(row.tier_ends_at) > Date.parse(now))).length],
    [t('suspicious'), suspicious],
    [t('expiredPlans'), rows.filter(row => row.tier === 'entry' && row.last_paid_ends_at !== null).length],
  ] as const;
  return (
    <section aria-label={t('summary')} className="space-y-2">
      {(scope || rows.length >= 100) && <p className="text-sm text-muted">{scope ?? t('first100')}</p>}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => <div key={label} className="glass-strong rounded-card p-5">
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="mt-3 text-4xl font-extrabold tabular-nums">{formatNumber(value, locale)}</dd>
        </div>)}
      </dl>
    </section>
  );
}
