'use client';
import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { localeDir } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { Deferred } from '@/ui/deferred';
import { LoadingState } from '@/ui/loading-state';
import { messages } from '../messages';
import { messages as dashboardMessages } from '../dashboard/messages';
import type { CaptainFilter } from '../dashboard-ui';
import type { AuditRow, CaptainRow, PlanTier } from '../types';
import type { AdminDashboard, AdminCaptainActivity } from '../dashboard-types';
import type { PendingCaptain } from './captain-requests';
import { AdminTopbar } from './admin-topbar';
import { PlanImportLink } from '../plan-import/plan-import-link';
const FoodPricesEntry = dynamic(() => import('@/features/meal-plans').then(module => module.FoodPricesEntry));
import { ActionStrip } from './action-strip';
import { DashboardKpis } from './dashboard-kpis';
import { CaptainTabs } from './captain-tabs';
import type { exportCaptainResults } from '../data/export-captain-results';
import type { LoadDetail } from './captain-side-panel';

const CaptainsTable = dynamic(() => import('./captains-table').then(module => module.CaptainsTable), {
  loading: () => <LoadingState className="min-h-96" />,
});
// Panels that open on demand or sit below the fold load separately to keep the first load within its budget.
const CaptainSidePanel = dynamic(() => import('./captain-side-panel').then(module => module.CaptainSidePanel), { ssr: false, loading: () => <LoadingState /> });
const SuspendDialog = dynamic(() => import('./suspend-dialog').then(module => module.SuspendDialog), { ssr: false });
const SignupsChart = dynamic(() => import('./signups-chart').then(module => module.SignupsChart), { loading: () => <LoadingState className="min-h-48" /> });
const PlanMix = dynamic(() => import('./plan-mix').then(module => module.PlanMix));
const CaptainRequests = dynamic(() => import('./captain-requests').then(module => module.CaptainRequests), { loading: () => <LoadingState /> });
const KoWaitlistCount = dynamic(() => import('./ko-waitlist-count').then(module => module.KoWaitlistCount));
// KpiRow is only the fallback when the dashboard read fails.
const KpiRow = dynamic(() => import('./kpi-row').then(module => module.KpiRow));
const SystemHealth = dynamic(() => import('./system-health').then(module => module.SystemHealth));
const AuditList = dynamic(() => import('./audit-list').then(module => module.AuditList), {
  ssr: false, loading: () => <LoadingState />,
});
interface Props {
  requests?: { rows: PendingCaptain[]; error: string | null };
  captains: { rows: CaptainRow[]; error: string | null; hasNext?: boolean; activity?: AdminCaptainActivity[]; activityError?: boolean };
  audit: { rows: AuditRow[]; error: string | null };
  plans: { rows: PlanTier[]; error: string | null };
  search: string; offset: number;
  kpis: { data: { captains: number; players: number; paid_captains: number } | null; error: string | null };
  dashboard?: { data: AdminDashboard | null; error: string | null };
  filter?: CaptainFilter;
  exportResults?: typeof exportCaptainResults;
  loadDetail?: LoadDetail;
}
export function AdminScreen({ captains, audit, plans, search, offset, kpis, requests, dashboard, filter = 'all', exportResults, loadDetail }: Props) {
  const t = useT(messages); const d = useT(dashboardMessages); const locale = useLocale(); const router = useRouter();
  const [exportError, setExportError] = useState('');
  const [selected, setSelected] = useState<CaptainRow | null>(null);
  const [suspending, setSuspending] = useState<CaptainRow | null>(null);
  const [message, setMessage] = useState('');
  const [activationPending, setActivationPending] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestsRef = useRef<HTMLDivElement>(null); const tableRef = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const close = useCallback(() => { setSelected(null); opener.current?.focus(); }, []);
  const rows = captains.rows;
  const activity = captains.activity ?? [];
  const filterUnavailable = captains.activityError && (filter === 'expiringSoon' || filter === 'quiet');
  const data = dashboard?.error ? null : dashboard?.data;
  function navigate(nextSearch: string, nextOffset: number, nextFilter?: CaptainFilter) {
    if (activationPending) return;
    const params = new URLSearchParams({ search: nextSearch, offset: String(nextOffset), filter: nextFilter ?? filter });
    setExportError(''); setSelected(null); startTransition(() => router.push(`/admin?${params}`, { scroll: nextFilter === undefined }));
  }
  function success(text: string) {
    setMessage(text); close(); setSuspending(null); startTransition(() => router.refresh());
  }
  function exportCsv() {
    if (!exportResults) return;
    setExportError('');
    startTransition(async () => {
      try {
        const result = await exportResults(search, filter);
        if ('error' in result) {
          setExportError(result.error === 'activity' ? d('activityUnavailable') : t('captainsFailed'));
          return;
        }
        const url = URL.createObjectURL(new Blob(['\uFEFF', result.csv], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = d('fileName');
        document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
      } catch { setExportError(t('captainsFailed')); }
    });
  }
  return <main dir={localeDir(locale)} className="mx-auto max-w-[1440px] space-y-section px-page-x py-page-y pt-[max(var(--spacing-page-y),var(--safe-top))] text-start">
    <AdminTopbar search={search} pending={pending || activationPending} onSearch={value => navigate(value, 0)} onExport={exportCsv} />
    <PlanImportLink />
    {exportError && <p role="alert" className="text-danger">{exportError}</p>}
    {data ? <><ActionStrip actions={data.actions} onRequests={() => { requestsRef.current?.scrollIntoView({ block: 'start' }); requestsRef.current?.focus(); }}
      onFilter={value => { navigate(search, 0, value); tableRef.current?.scrollIntoView({ block: 'start' }); tableRef.current?.focus(); }} />
      <DashboardKpis data={data} /></> : <>
      <div role="status" className="glass space-y-stack rounded-card p-card text-sm text-muted"><p>{dashboard?.error || d('unavailable')}</p>
        {dashboard?.error && <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{t('retry')}</Button>}</div>
      {kpis.error ? <p role="alert" className="text-danger">{kpis.error}</p> : kpis.data && <KpiRow data={kpis.data} />}
    </>}
    <div className="grid items-start gap-section min-[1100px]:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-section">
        {data && <SignupsChart signups={data.signups} />}
        <section ref={tableRef} id="captain-management" tabIndex={-1} aria-label={t('manage')} className="glass space-y-card-gap rounded-card p-card">
          <h2 className="text-title font-semibold">{t('manageCaptains')}</h2>
          <CaptainTabs filter={filter} counts={data?.stateCounts} onChange={value => navigate(search, 0, value)} />
          <p role="status" aria-live="polite" className="text-sm text-muted">{pending ? t('loading') : message}</p>
          {captains.activityError && <div role="alert"><p className="text-danger">{d('activityUnavailable')}</p>
            <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{t('retry')}</Button>
          </div>}
          {captains.error ? <div role="alert"><p className="text-danger">{captains.error}</p>
            <Button variant="secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{t('retry')}</Button>
          </div> : !filterUnavailable && <>
            {plans.error && <p role="alert" className="text-danger">{plans.error}</p>}
            <div className="min-w-0" aria-busy={pending}>
              <CaptainsTable rows={rows} activity={activity} selected={suspending ? null : selected?.id ?? null} disabled={activationPending}
                onReset={() => navigate('', 0, 'all')} onActivate={row => {
                  if (activationPending) return;
                  opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                  setSelected(row); setMessage('');
                }} onSuspend={setSuspending} />
            </div>
            <nav aria-label={t('pages')} className="flex items-center justify-between gap-inline">
              <Button variant="secondary" disabled={pending || activationPending || offset === 0} onClick={() => navigate(search, Math.max(0, offset - 100))}>{t('previous')}</Button>
              <span className="num text-sm text-muted">{t('page', { n: formatNumber(Math.floor(offset / 100) + 1, locale) })}</span>
              <Button variant="secondary" disabled={pending || activationPending || !captains.hasNext} onClick={() => navigate(search, offset + 100)}>{t('next')}</Button>
            </nav>
          </>}
        </section>
        <Deferred fallback={<LoadingState className="min-h-96" />}><AuditList rows={audit.rows} captains={captains.rows} error={audit.error} /></Deferred>
      </div>
      <aside className="min-w-0 space-y-section">
        {selected && <CaptainSidePanel key={selected.id} captain={selected} plans={plans.rows} loadDetail={loadDetail}
          onClose={close} onSuccess={success} onSuspend={setSuspending} activationPending={activationPending} onPendingChange={setActivationPending} />}
        <div ref={requestsRef} tabIndex={-1}>
          <CaptainRequests rows={requests?.rows ?? []} error={requests?.error ?? null} primaryAction={!selected} />
        </div>
        {data && <PlanMix mix={data.planMix} />}
        <KoWaitlistCount />
        <FoodPricesEntry platform />
        {data && <SystemHealth health={data.health} />}
      </aside>
    </div>
    {suspending && <SuspendDialog key={suspending.id} captain={suspending} onClose={() => setSuspending(null)} onSuccess={success} />}
  </main>;
}
