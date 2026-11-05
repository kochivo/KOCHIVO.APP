'use client';
import { localeDir } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/ui/button';
import { captainState, stateLabels } from '../format';
import type { AuditRow, CaptainRow, CaptainState, PlanTier } from '../types';
import { KpiRow } from './kpi-row';
import { LoadingState } from '@/ui/loading-state';
import { ActivatePanel } from './activate-panel';
import { SuspendDialog } from './suspend-dialog';
import { Deferred } from '@/ui/deferred';
import { signOutAdmin } from '../data/sign-out';
import { clearDeviceRole } from '@/core/pwa/device-role';
import { CaptainRequests } from './captain-requests';
import type { PendingCaptain } from './captain-requests';

const CaptainsTable = dynamic(() => import('./captains-table').then(module => module.CaptainsTable), {
  loading: () => <LoadingState className="min-h-96" />,
});
const AuditList = dynamic(() => import('./audit-list').then(module => module.AuditList), {
  ssr: false, loading: () => <LoadingState />,
});

interface Props {
  requests?: { rows: PendingCaptain[]; error: string | null };
  captains: { rows: CaptainRow[]; error: string | null };
  audit: { rows: AuditRow[]; error: string | null };
  plans: { rows: PlanTier[]; error: string | null };
  search: string;
  offset: number;
  kpis: { data: { captains: number; players: number; paid_captains: number } | null; error: string | null };
}
const filters: Array<'all' | CaptainState> = ['all', 'paid', 'free', 'expired', 'unconfirmed', 'suspended'];
export function AdminScreen({ captains, audit, plans, search, offset, kpis, requests }: Props) {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | CaptainState>('all');
  const [selected, setSelected] = useState<CaptainRow | null>(null);
  const [suspending, setSuspending] = useState<CaptainRow | null>(null);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const rows = captains.rows.filter(row => filter === 'all' || captainState(row) === filter);
  function navigate(nextSearch: string, nextOffset: number) {
    const params = new URLSearchParams({ search: nextSearch, offset: String(nextOffset) });
    setSelected(null);
    startTransition(() => router.push(`/admin?${params}`));
  }
  function success(text: string) {
    setMessage(text); setSelected(null); setSuspending(null);
    startTransition(() => router.refresh());
  }
  return <main dir={localeDir(locale)} className="mx-auto max-w-[1440px] space-y-7 px-4 py-8 pt-[max(2rem,var(--safe-top))] text-start lg:px-8 lg:py-12 lg:pt-[max(3rem,var(--safe-top))]">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
      <h1 className="text-3xl font-extrabold lg:text-4xl">{t('admin')}</h1>
      <form action={signOutAdmin} onSubmit={clearDeviceRole}>
        <Button type="submit" variant="danger" className="min-h-12">{t('signOut')}</Button>
      </form>
      <span className="flex items-center gap-2 rounded-control border border-line px-4 py-2 text-sm text-muted">
        <ShieldCheck aria-hidden className="size-4" /> {t('adminOnly')}
      </span>
    </header>
    {requests && <CaptainRequests rows={requests.rows} error={requests.error} />}
    {kpis.error ? <p role="alert" className="text-danger">{kpis.error}</p> : kpis.data && <KpiRow data={kpis.data} />}
    <section id="captain-management" tabIndex={-1} aria-label={t('manage')} className="space-y-5">
      <form className="flex gap-2" onSubmit={event => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get('search');
        navigate(typeof value === 'string' ? value : '', 0);
      }}>
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">{t('searchLabel')}</span>
          <Search aria-hidden className="pointer-events-none absolute start-4 top-4 size-5 text-muted" />
          <input key={search} name="search" defaultValue={search} placeholder={t('searchPlaceholder')}
            className="min-h-14 w-full rounded-control border border-line bg-surface ps-12 pe-4" />
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>{t('search')}</Button>
      </form>
      <div aria-label={t('filter')} className="flex flex-wrap gap-2">
        {filters.map(value => <button key={value} type="button" aria-pressed={filter === value}
          onClick={() => setFilter(value)}
          className={`min-h-12 rounded-control border px-4 text-sm ${filter === value ? 'border-ink bg-surface-raised font-bold' : 'border-line text-muted'}`}>
          {value === 'all' ? t('all') : t(stateLabels[value])}
        </button>)}
      </div>
      <p role="status" aria-live="polite" className="text-sm text-muted">{pending ? t('loading') : message}</p>
      {captains.error ? <div role="alert" className="glass rounded-card p-5">
        <p className="text-danger">{captains.error}</p>
        <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{t('retry')}</Button>
      </div> : <>
        {plans.error && <p role="alert" className="text-danger">{plans.error}</p>}
        <div className={selected ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]' : ''}>
          <div className="min-w-0" aria-busy={pending}>
            <CaptainsTable rows={rows} selected={suspending ? null : selected?.id ?? null} onReset={() => { setFilter('all'); navigate('', 0); }}
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
        <nav aria-label={t('pages')} className="flex items-center justify-between gap-2">
          <Button variant="ghost" disabled={pending || offset === 0} onClick={() => navigate(search, Math.max(0, offset - 100))}>{t('previous')}</Button>
          <span className="text-sm text-muted">{t('page', { n: formatNumber(Math.floor(offset / 100) + 1, locale) })}</span>
          <Button variant="ghost" disabled={pending || captains.rows.length < 100} onClick={() => navigate(search, offset + 100)}>{t('next')}</Button>
        </nav>
      </>}
    </section>
    <Deferred fallback={<LoadingState className="min-h-96" />}><AuditList rows={audit.rows} captains={captains.rows} error={audit.error} /></Deferred>
    {suspending && <SuspendDialog key={suspending.id} captain={suspending} onClose={() => setSuspending(null)} onSuccess={success} />}
  </main>;
}
