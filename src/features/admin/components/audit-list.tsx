'use client';
import { formatTimestampAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { endsLabel } from '../format';
import type { AuditRow, CaptainRow } from '../types';

export function AuditList({ rows, captains, error }: { rows: AuditRow[]; captains: CaptainRow[]; error: string | null }) {
  const t = useT(messages);
  const labels = { activate_plan: t('activatePlan'), suspend: t('suspendAction'), unsuspend: t('unsuspendAction') };
  const locale = useLocale();
  return <section className="glass rounded-card p-5" aria-labelledby="audit-title">
    <h2 id="audit-title" className="mb-5 text-xl font-bold">{t('audit')}</h2>
    {error ? <p role="alert" className="text-danger">{error}</p> : !rows.length ?
      <p className="text-muted">{t('noAudit')}</p> :
      <ol className="divide-y divide-line">{rows.map(row => <li key={row.id} className="space-y-2 py-4 first:pt-0">
        <div className="flex flex-wrap justify-between gap-2">
          <p className="break-words font-bold">{labels[row.action]} · {captains.find(captain => captain.id === row.target_id)?.full_name ?? row.target_id}</p>
          <time dateTime={row.created_at} className="text-sm text-muted">{endsLabel(row.created_at, locale)}{' '}
            {formatTimestampAr(row.created_at, { hour: '2-digit', minute: '2-digit' }, locale)}
          </time>
        </div>
        <p className="break-all text-xs text-muted">{t('by', { id: row.admin_id })}</p>
        {typeof row.details.reason === 'string' && <p className="break-words text-sm">{row.details.reason}</p>}
        {row.action === 'activate_plan' && <p className="text-sm text-muted">
          {String(row.details.tier ?? '').toUpperCase()} · {t('months', { n: Number(row.details.months ?? 0), count: formatNumber(Number(row.details.months ?? 0), locale) })} · {t('currency', { amount: formatNumber(Number(row.details.amount_egp ?? 0), locale) })}
        </p>}
      </li>)}</ol>}
  </section>;
}
