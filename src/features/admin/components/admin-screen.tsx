'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/ui/button';
import { captainState, stateLabels } from '../format';
import type { AuditRow, CaptainRow, CaptainState, PlanTier } from '../types';
import { KpiRow } from './kpi-row';
import { CaptainsTable } from './captains-table';
import { ActivatePanel } from './activate-panel';
import { SuspendDialog } from './suspend-dialog';
import { AuditList } from './audit-list';

interface Props {
  captains: { rows: CaptainRow[]; error: string | null };
  audit: { rows: AuditRow[]; error: string | null };
  plans: { rows: PlanTier[]; error: string | null };
  search: string;
  offset: number;
  today: string;
  now: string;
}
const filters: Array<'all' | CaptainState> = ['all', 'paid', 'free', 'expired', 'unconfirmed', 'suspended'];
export function AdminScreen({ captains, audit, plans, search, offset, today, now }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | CaptainState>('all');
  const [selected, setSelected] = useState<CaptainRow | null>(null);
  const [suspending, setSuspending] = useState<CaptainRow | null>(null);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const rows = captains.rows.filter(row => filter === 'all' || captainState(row, today) === filter);
  function navigate(nextSearch: string, nextOffset: number) {
    const params = new URLSearchParams({ search: nextSearch, offset: String(nextOffset) });
    setSelected(null);
    startTransition(() => router.push(`/admin?${params}`));
  }
  function success(text: string) {
    setMessage(text); setSelected(null); setSuspending(null);
    startTransition(() => router.refresh());
  }
  return <main dir="rtl" className="mx-auto max-w-[1440px] space-y-7 px-4 py-8 text-start lg:px-8 lg:py-12">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
      <h1 className="text-3xl font-extrabold lg:text-4xl">لوحة الإدارة</h1>
      <span className="flex items-center gap-2 rounded-control border border-line px-4 py-2 text-sm text-muted">
        <ShieldCheck aria-hidden className="size-4" /> ADMIN · للإدارة بس
      </span>
    </header>
    {!captains.error && <KpiRow rows={captains.rows} now={now}
      scope={offset > 0 ? 'من الصفحة الحالية' : search ? 'من نتائج البحث' : undefined} />}
    <section aria-label="إدارة الكباتن" className="space-y-5">
      <form className="flex gap-2" onSubmit={event => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get('search');
        navigate(typeof value === 'string' ? value : '', 0);
      }}>
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">دور باسم الكابتن أو الإيميل</span>
          <Search aria-hidden className="pointer-events-none absolute start-4 top-4 size-5 text-muted" />
          <input key={search} name="search" defaultValue={search} placeholder="دور بالاسم أو الإيميل"
            className="min-h-14 w-full rounded-control border border-line bg-surface ps-12 pe-4" />
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>بحث</Button>
      </form>
      <div aria-label="فلتر الحالة" className="flex flex-wrap gap-2">
        {filters.map(value => <button key={value} type="button" aria-pressed={filter === value}
          onClick={() => setFilter(value)}
          className={`min-h-12 rounded-control border px-4 text-sm ${filter === value ? 'border-ink bg-surface-raised font-bold' : 'border-line text-muted'}`}>
          {value === 'all' ? 'الكل' : stateLabels[value]}
        </button>)}
      </div>
      <p role="status" aria-live="polite" className="text-sm text-muted">{pending ? 'جاري تحميل البيانات…' : message}</p>
      {captains.error ? <div role="alert" className="glass rounded-card p-5">
        <p className="text-danger">{captains.error}</p>
        <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>جرّب تاني</Button>
      </div> : <>
        {plans.error && <p role="alert" className="text-danger">{plans.error}</p>}
        <div className={selected ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]' : ''}>
          <div className="min-w-0" aria-busy={pending}>
            <CaptainsTable rows={rows} today={today} selected={suspending ? null : selected?.id ?? null}
              onActivate={row => {
                setSelected(row); setMessage('');
                requestAnimationFrame(() => panelRef.current?.focus());
              }}
              onSuspend={row => setSuspending(row)} />
          </div>
          {selected && <div ref={panelRef} tabIndex={-1} className="min-w-0">
            <ActivatePanel key={selected.id} captain={selected} plans={plans.rows}
              onClose={() => setSelected(null)} onSuccess={success} />
          </div>}
        </div>
        <nav aria-label="صفحات الكباتن" className="flex items-center justify-between gap-2">
          <Button variant="ghost" disabled={pending || offset === 0} onClick={() => navigate(search, Math.max(0, offset - 100))}>السابق</Button>
          <span className="text-sm text-muted">صفحة {Math.floor(offset / 100) + 1}</span>
          <Button variant="ghost" disabled={pending || captains.rows.length < 100} onClick={() => navigate(search, offset + 100)}>التالي</Button>
        </nav>
      </>}
    </section>
    <AuditList rows={audit.rows} captains={captains.rows} error={audit.error} />
    {suspending && <SuspendDialog key={suspending.id} captain={suspending} onClose={() => setSuspending(null)} onSuccess={success} />}
  </main>;
}
