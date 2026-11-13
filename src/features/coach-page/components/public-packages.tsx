import 'server-only';
import { fetchPackageCatalog } from '@/features/billing/server';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import type { PublicT } from './public-types';
import { PublicPackageCards } from './public-package-cards';

export async function PublicPackages({ captainId, ...props }: {
  captainId: string; signup: string; requested?: CoachRequestStatus; t: PublicT; now: Date;
}) {
  const catalog = await fetchPackageCatalog(captainId);
  return <PublicPackageCards catalog={catalog} {...props} />;
}
