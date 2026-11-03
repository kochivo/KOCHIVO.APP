'use client';

import { Button } from '@/ui/button';
import { captainState, endsLabel, stateLabels, tierLabel, usageLabel } from '../format';
import type { CaptainRow } from '../types';

interface Props {
  rows: CaptainRow[];
  today: string;
  selected: string | null;
  onActivate: (row: CaptainRow) => void;
  onSuspend: (row: CaptainRow) => void;
}
export function CaptainsTable({ rows, today, selected, onActivate, onSuspend }: Props) {
  const controls = (row: CaptainRow) => <div className="flex flex-wrap gap-2">
    <Button variant="secondary" className={selected === row.id ? 'border-lime text-lime' : ''} onClick={() => onActivate(row)}>فعّل باقة</Button>
    <Button variant="ghost" onClick={() => onSuspend(row)}>{row.suspended ? 'رجّع' : 'وقّف'}</Button>
  </div>;
  if (!rows.length) return <p className="glass rounded-card p-8 text-muted">مفيش كباتن بالاختيار ده. جرّب بحث أو فلتر تاني.</p>;
  return <>
    <div className="hidden overflow-x-auto rounded-card border border-line lg:block">
      <table className="w-full text-start text-sm">
        <caption className="sr-only">الكباتن وباقاتهم وحد اللاعبين</caption>
        <thead className="bg-surface text-muted"><tr>
          {['الكابتن', 'الباقة', 'اللاعبين', 'نهاية الباقة', 'الحالة', 'الإجراءات'].map(title =>
            <th key={title} scope="col" className="p-4 text-start font-medium">{title}</th>)}
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className={selected === row.id ? 'border-t border-line bg-lime-soft' : 'border-t border-line bg-surface/50'}>
          <th scope="row" className="max-w-64 break-words p-4 text-start font-medium">
            {row.full_name}<span dir="ltr" className="mt-1 block break-all text-start text-xs text-muted">{row.email ?? 'من غير إيميل'}</span>
          </th>
          <td className="p-4 font-bold">{tierLabel(row.tier)}</td>
          <td className="whitespace-nowrap p-4 tabular-nums">{usageLabel(row.active_players, row.player_limit)}</td>
          <td className="p-4">{endsLabel(row.tier_ends_at)}</td>
          <td className="p-4">{stateLabels[captainState(row, today)]}</td>
          <td className="p-4">{controls(row)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <ul className="space-y-3 lg:hidden">{rows.map(row => <li key={row.id} className="glass space-y-4 rounded-card p-4">
      <div><h3 className="font-bold">{row.full_name}</h3>
        <p dir="ltr" className="break-all text-start text-sm text-muted">{row.email ?? 'من غير إيميل'}</p></div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted">الباقة</dt><dd>{tierLabel(row.tier)}</dd></div>
        <div><dt className="text-muted">اللاعبين</dt><dd>{usageLabel(row.active_players, row.player_limit)}</dd></div>
        <div><dt className="text-muted">نهاية الباقة</dt><dd>{endsLabel(row.tier_ends_at)}</dd></div>
        <div><dt className="text-muted">الحالة</dt><dd>{stateLabels[captainState(row, today)]}</dd></div>
      </dl>
      {controls(row)}
    </li>)}</ul>
  </>;
}
