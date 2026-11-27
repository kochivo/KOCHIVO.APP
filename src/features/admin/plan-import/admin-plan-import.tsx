import 'server-only';

import { requireAdmin } from '../data/require-admin';
import { PlanImportEntry } from './plan-import-entry';

export async function AdminPlanImport() {
  await requireAdmin();
  return <PlanImportEntry />;
}
