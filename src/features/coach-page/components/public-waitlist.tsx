'use client';
import { usePublicWaitlist } from './public-waitlist-provider';
import { Button } from '@/ui/button';
import { KoInvite } from '@/ui/icons/ko-invite';

export type WaitlistLabels = Record<'waitlist' | 'waitlisted' | 'member' | 'failure' | 'pending', string>;

// Labels come from the server so the full section copy stays out of the client bundle.
export function PublicWaitlist({ labels }: { labels: WaitlistLabels }) {
  const t = (key: keyof WaitlistLabels) => labels[key];
  const { pending, status, submit } = usePublicWaitlist();
  return <div>
    <Button className="w-full rounded-full md:w-auto" disabled={pending || status === 'member' || status === 'waitlisted'} onClick={submit}><KoInvite aria-hidden className="size-5" />{pending ? t('pending') : t(status === 'waitlisted' ? 'waitlisted' : status === 'member' ? 'member' : 'waitlist')}</Button>
    {status && <p role={status === 'failure' ? 'alert' : 'status'} className="mt-inline text-sm text-muted">{t(status)}</p>}
  </div>;
}
