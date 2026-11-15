import Link from 'next/link';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import type { PublicT } from './public-types';
import { buttonClass } from '@/ui/button';

export function PublicRequestStatus({ requested, t }: { requested: CoachRequestStatus; t: PublicT }) {
  return <div role="status" className="glass-strong space-y-4 rounded-card p-6">
    <p>{t(requested)}</p>
    {requested === 'member' && <Link href="/player" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-6" })}>{t('openApp')}</Link>}
  </div>;
}
