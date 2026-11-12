import { notFound } from 'next/navigation';
import { PackageCatalog } from '@/features/billing';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default function PackagesPage() {
  if (!captainWorkspaceEnabled()) notFound();
  return <PackageCatalog />;
}
