import { InviteButton } from '@/features/roster';
import { KoPlus } from '@/ui/icons/ko-plus';

// Server-rendered: a client file importing the roster barrel pulls its server data modules into the browser build.
export function HomeInvite({ name, label }: { name: string; label: string }) {
  return <span className="relative inline-flex shrink-0"><KoPlus aria-hidden className="pointer-events-none absolute start-3 top-1/2 z-10 size-[18px] -translate-y-1/2 text-on-lime" />
    <InviteButton captainFirstName={name} label={label} className="min-h-12 w-auto! rounded-[10px] pe-3.5 ps-10 font-semibold!" /></span>;
}
