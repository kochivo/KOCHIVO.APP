import { endsLabel } from '../format';
import type { AuditRow, CaptainRow } from '../types';

const labels = { activate_plan: 'تفعيل باقة', suspend: 'إيقاف حساب', unsuspend: 'ترجيع حساب' };
export function AuditList({ rows, captains, error }: { rows: AuditRow[]; captains: CaptainRow[]; error: string | null }) {
  return <section className="glass rounded-card p-5" aria-labelledby="audit-title">
    <h2 id="audit-title" className="mb-5 text-xl font-bold">آخر العمليات</h2>
    {error ? <p role="alert" className="text-danger">{error}</p> : !rows.length ?
      <p className="text-muted">لسه مفيش عمليات.</p> :
      <ol className="divide-y divide-line">{rows.map(row => <li key={row.id} className="space-y-2 py-4 first:pt-0">
        <div className="flex flex-wrap justify-between gap-2">
          <p className="break-words font-bold">{labels[row.action]} · {captains.find(captain => captain.id === row.target_id)?.full_name ?? row.target_id}</p>
          <time dateTime={row.created_at} className="text-sm text-muted">{endsLabel(row.created_at)}{' '}
            {new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }).format(new Date(row.created_at))}
          </time>
        </div>
        <p className="break-all text-xs text-muted">بواسطة: {row.admin_id}</p>
        {typeof row.details.reason === 'string' && <p className="break-words text-sm">{row.details.reason}</p>}
        {row.action === 'activate_plan' && <p className="text-sm text-muted">
          {String(row.details.tier ?? '').toUpperCase()} · {String(row.details.months ?? '')} شهر · {String(row.details.amount_egp ?? '')} ج
        </p>}
      </li>)}</ol>}
  </section>;
}
