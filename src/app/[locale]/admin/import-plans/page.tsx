import { AdminPlanImport } from '@/features/admin/server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

export default function AdminPlanImportPage() {
  return <AdminPlanImport />;
}
