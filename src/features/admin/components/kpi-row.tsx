import type { CaptainRow } from '../types';

export function KpiRow({ rows, now, scope }: { rows: CaptainRow[]; now: string; scope?: string }) {
  const suspicious = rows.filter(row => {
    const age = Date.parse(now) - Date.parse(row.created_at);
    return !row.email_confirmed && row.active_players === 0 && age >= 0 && age < 86_400_000;
  }).length;
  const stats = [
    ['كباتن مسجلين', rows.length],
    ['باقات مدفوعة', rows.filter(row => row.tier !== 'entry'
      && (!row.tier_ends_at || Date.parse(row.tier_ends_at) > Date.parse(now))).length],
    ['مشبوهين', suspicious],
    ['باقات خلصت', rows.filter(row => row.tier === 'entry' && row.last_paid_ends_at !== null).length],
  ] as const;
  return (
    <section aria-label="ملخص الكباتن" className="space-y-2">
      {(scope || rows.length >= 100) && <p className="text-sm text-muted">{scope ?? 'من أول 100'}</p>}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => <div key={label} className="glass-strong rounded-card p-5">
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="mt-3 text-4xl font-extrabold tabular-nums">{value}</dd>
        </div>)}
      </dl>
    </section>
  );
}
