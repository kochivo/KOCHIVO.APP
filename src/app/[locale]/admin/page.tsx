import { Suspense } from 'react';
import { createT, parseLocale } from '@/core/i18n';
import { AdminScreen, requireAdmin, fetchCaptains, fetchPlanTiers, fetchAudit, fetchKpis, fetchPendingCaptains, fetchAdminDashboard, fetchCaptainActivity, loadCaptainDetail, messages } from '@/features/admin';

export const dynamic = 'force-dynamic';
type RouteParams = Promise<{ locale: string }>;
export async function generateMetadata({ params }: { params: RouteParams }) {
  const { locale } = await params;
  return { title: createT(messages, parseLocale(locale))('admin'), robots: { index: false } };
}
type Params = Promise<{ search?: string; offset?: string }>;

async function AdminData({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const search = params.search ?? '';
  const parsedOffset = Number(params.offset ?? 0);
  const offset = Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  const [captains, plans, audit, kpis, requests, dashboard] = await Promise.all([
    fetchCaptains({ search, limit: 100, offset }), fetchPlanTiers(), fetchAudit(), fetchKpis(), fetchPendingCaptains(), fetchAdminDashboard(),
  ]);
  const activity = captains.rows.length ? await fetchCaptainActivity(captains.rows.map(row => row.id)) : { data: [], error: null };
  return <AdminScreen captains={captains} plans={plans} audit={audit} kpis={kpis} requests={requests} search={search} offset={offset}
    dashboard={dashboard} activity={activity.data ?? []} loadDetail={loadCaptainDetail} />;
}

export default async function AdminPage({ searchParams, params }: { searchParams: Params; params: RouteParams }) {
  const { locale } = await params;
  const t = createT(messages, parseLocale(locale));
  await requireAdmin();
  return <Suspense fallback={<p role="status" className="p-8 text-muted">{t('loadingAdmin')}</p>}>
    <AdminData searchParams={searchParams} />
  </Suspense>;
}
