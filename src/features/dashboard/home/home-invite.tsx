'use client';
import Link from 'next/link';
import { buttonClass } from '@/ui/button';
import { KoPlus } from '@/ui/icons/ko-plus';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { PageBarMenu } from '@/ui/page-bar-menu';

export function HomeInvite({ label, secondary = false }: { name: string; label: string; secondary?: boolean }) {
  const workspace = captainWorkspaceEnabled();
  const invite = <Link href="/captain/players/new" data-tour="invite-player" className={buttonClass({ variant: secondary ? 'secondary' : 'primary', block: false,
    className: workspace ? 'min-h-12 shrink-0 font-semibold! max-md:hidden!' : 'min-h-12 shrink-0 font-semibold!',
  })}><KoPlus aria-hidden className="size-5" />{label}</Link>;
  return workspace ? <>{invite}<PageBarMenu><Link href="/captain/players/new" className={buttonClass({ variant: 'ghost', block: false })}>
    <KoPlus aria-hidden className="size-5" />{label}
  </Link></PageBarMenu></> : invite;
}
