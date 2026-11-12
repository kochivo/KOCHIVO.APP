import { InviteButton } from '@/features/roster';

// Server-rendered: a client file importing the roster barrel pulls its server data modules into the browser build.
export function HomeInvite({ name, label }: { name: string; label: string }) {
  return <InviteButton captainFirstName={name} label={label} className="min-h-12 w-auto! rounded-full bg-none! px-5 font-semibold! shadow-none!" />;
}
