'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui/button';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function PlanBadgeError({ message, retryLabel }: { message: string; retryLabel: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <div role="alert" aria-busy={pending} className="glass inline-flex flex-wrap items-center gap-inline rounded-control px-page-x text-sm">
    <span className="text-danger">{message}</span>
    {captainWorkspaceEnabled() ? <Button variant="secondary" disabled={pending} className="min-h-12 font-bold"
      onClick={() => start(() => router.refresh())}>{retryLabel}</Button>
      : <button type="button" disabled={pending} className="min-h-12 px-inline font-bold text-ink disabled:opacity-40"
        onClick={() => start(() => router.refresh())}>{retryLabel}</button>}
  </div>;
}
