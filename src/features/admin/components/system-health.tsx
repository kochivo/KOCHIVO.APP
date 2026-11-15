'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../dashboard/messages';
import type { AdminDashboard } from '../dashboard-types';

export function SystemHealth({ health }: { health: AdminDashboard['health'] }) {
  const t = useT(messages); const locale = useLocale();
  return <section className="glass grid gap-stack rounded-card p-card" aria-labelledby="health-title">
    <h2 id="health-title" className="text-title font-semibold">{t('health')}</h2>
    <dl className="divide-y divide-line text-row">
      {(['cronJobs', 'cronFailures24h', 'pendingDeletions'] as const).map(key => <div key={key} className="flex justify-between gap-inline py-stack">
        <dt className="text-muted">{t(key === 'cronFailures24h' ? 'cronFailures' : key)}</dt>
        <dd className={`num font-semibold ${key === 'cronFailures24h' && health[key] > 0 ? 'text-warn' : 'text-ink'}`}>{formatNumber(health[key], locale)}</dd>
      </div>)}
    </dl>
    <p className="text-xs text-muted">{t('passwordSetting')}</p>
  </section>;
}
