import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminScreen, requireAdmin, fetchCaptains, fetchPlanTiers, fetchAudit } from '@/features/admin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'لوحة الإدارة', robots: { index: false } };
type Params = Promise<{ search?: string; offset?: string }>;

async function AdminData({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const search = params.search ?? '';
  const parsedOffset = Number(params.offset ?? 0);
  const offset = Number.isSafeInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
  const [captains, plans, audit] = await Promise.all([
    fetchCaptains({ search, limit: 100, offset }), fetchPlanTiers(), fetchAudit(),
  ]);
  const now = new Date();
  return <AdminScreen captains={captains} plans={plans} audit={audit} search={search} offset={offset}
    now={now.toISOString()} />;
}

export default async function AdminPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();
  return <Suspense fallback={<p role="status" className="p-8 text-muted">جاري تحميل لوحة الإدارة…</p>}>
    <AdminData searchParams={searchParams} />
  </Suspense>;
}
