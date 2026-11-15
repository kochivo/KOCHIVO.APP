'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/ui/button';
import { KoInvite } from '@/ui/icons/ko-invite';
import { joinWaitlist } from '../data/waitlist';

export type WaitlistLabels = Record<'waitlist' | 'waitlisted' | 'member' | 'failure' | 'pending', string>;

// Labels come from the server so the full section copy stays out of the client bundle.
export function PublicWaitlist({ slug, labels }: { slug: string; labels: WaitlistLabels }) {
  const t = (key: keyof WaitlistLabels) => labels[key], [pending, start] = useTransition();
  const [status, setStatus] = useState<'waitlisted' | 'member' | 'failure' | null>(null);
  return <div>
    <Button className="w-full rounded-full md:w-auto" disabled={pending || status === 'member'} onClick={() => start(async () => {
      try {
        const result = await joinWaitlist(slug);
        if (result.redirect) { window.location.assign(result.redirect); return; }
        setStatus(result.status ?? 'failure');
      } catch { setStatus('failure'); }
    })}><KoInvite aria-hidden className="size-5" />{pending ? t('pending') : t(status === 'waitlisted' ? 'waitlisted' : status === 'member' ? 'member' : 'waitlist')}</Button>
    {status && <p role={status === 'failure' ? 'alert' : 'status'} className="mt-inline text-sm text-muted">{t(status)}</p>}
  </div>;
}
