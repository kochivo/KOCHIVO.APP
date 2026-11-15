import Link from 'next/link';
import { buttonClass } from '@/ui/button';
import { KoPlus } from '@/ui/icons/ko-plus';

export function HomeInvite({ label }: { name: string; label: string }) {
  return <Link href="/captain/players/new" data-tour="invite-player" className={buttonClass({ block: false,
    className: 'min-h-12 shrink-0 font-semibold!',
  })}><KoPlus aria-hidden className="size-5" />{label}</Link>;
}
