'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { KoInvite } from '@/ui/icons/ko-invite';
import { buttonClass } from '@/ui/button';

export function InviteButton({ label, className }: { captainFirstName: string; label: string; className?: string }) {
  return <Link href="/captain/players/new" data-tour="invite-player" className={buttonClass({ variant: 'primary', block: false, className: cn("press inline-flex min-h-12 cursor-pointer items-center justify-center gap-inline px-page-x text-sm font-bold focus-visible:ring-2 focus-visible:ring-lime", className) })}><KoInvite aria-hidden className="size-5" />{label}</Link>;
}
