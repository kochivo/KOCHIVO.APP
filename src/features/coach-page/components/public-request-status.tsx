import Link from 'next/link';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import type { PublicT } from './public-types';

export function PublicRequestStatus({ requested, t }: { requested: CoachRequestStatus; t: PublicT }) {
  return <div role="status" className="glass-strong space-y-4 rounded-card p-6">
    <p>{t(requested)}</p>
    {requested === 'member' && <Link href="/player" className="glass inline-flex min-h-12 items-center rounded-full px-6">{t('openApp')}</Link>}
  </div>;
}
