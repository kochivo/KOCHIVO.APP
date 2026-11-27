'use client';
import { formatTimestampAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { History } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import { endsLabel } from '../format';
import type { AuditRow, CaptainRow } from '../types';

export function AuditList({ rows, captains, error }: { rows: AuditRow[]; captains: CaptainRow[]; error: string | null }) {
  const t = useT(messages);
  const labels = { activate_plan: t('activatePlan'), suspend: t('suspendAction'), unsuspend: t('unsuspendAction'),
    approve_captain: t('approveCaptain'), reject_captain: t('rejectCaptain'), import_template: t('importedTemplate') };
  const locale = useLocale();
  return <section className="glass rounded-card p-card" aria-labelledby="audit-title">
    <h2 id="audit-title" className="mb-card-gap text-title font-semibold">{t('audit')}</h2>
    {error ? <p role="alert" className="text-danger">{error}</p> : !rows.length ?
      <EmptyState icon={History} title={t('noAudit')} body={t('auditHint')} secondary={{ label: t('manageCaptains'), href: '#captain-management' }} /> :
      <ol className="space-y-card-gap border-s border-line ps-card">{rows.map(row => <li key={row.id} className="relative space-y-inline">
        <span aria-hidden className="absolute -start-card top-2 size-2 -translate-x-1/2 rounded-full bg-lime rtl:translate-x-1/2" />
        <div className="flex flex-wrap justify-between gap-inline">
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
