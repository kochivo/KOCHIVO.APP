'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function PlanBadgeError({ message, retryLabel }: { message: string; retryLabel: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return <div role="alert" aria-busy={pending} className="glass inline-flex flex-wrap items-center gap-2 rounded-control px-4 text-sm">
    <span className="text-danger">{message}</span>
    <button type="button" disabled={pending} className="min-h-12 px-2 font-bold text-ink disabled:opacity-40"
      onClick={() => start(() => router.refresh())}>{retryLabel}</button>
  </div>;
}
