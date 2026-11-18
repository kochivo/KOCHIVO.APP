'use client';
import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { buttonClass } from '@/ui/button';
import { KoPlus } from '@/ui/icons/ko-plus';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

const phone = '(width < 48rem)';
function subscribe(onChange: () => void) {
  if (!captainWorkspaceEnabled() || !window.matchMedia) return () => {};
  const media = window.matchMedia(phone);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function HomeInvite({ label }: { name: string; label: string }) {
  const isPhone = useSyncExternalStore(subscribe, () => captainWorkspaceEnabled() && Boolean(window.matchMedia?.(phone).matches), () => false);
  return <Link href="/captain/players/new" data-tour="invite-player" className={buttonClass({ variant: isPhone ? 'secondary' : 'primary', block: false,
    className: 'min-h-12 shrink-0 font-semibold!',
  })}><KoPlus aria-hidden className="size-5" />{label}</Link>;
}
