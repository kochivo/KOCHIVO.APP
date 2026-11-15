'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { KoInvite } from '@/ui/icons/ko-invite';

export function InviteButton({ label, className }: { captainFirstName: string; label: string; className?: string }) {
  return <Link href="/captain/players/new" data-tour="invite-player" className={cn('press inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-control bg-lime px-4 text-sm font-bold text-on-lime focus-visible:ring-2 focus-visible:ring-lime', className)}><KoInvite aria-hidden className="size-5" />{label}</Link>;
}
