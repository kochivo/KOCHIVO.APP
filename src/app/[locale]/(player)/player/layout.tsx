import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { PageContainer } from '@/ui';
import { PlayerShell } from '@/features/player-shell';
import { ProductTour } from '@/features/product-tour';
import { DemoMode } from '@/features/demo';
import { KoAccountLink } from '@/features/ko-preview/server';
import { SignOutButton } from '@/features/auth';
import { TimezoneBoundary } from '@/core/timezone/boundary';

export default async function PlayerLayout({ children }: { children: ReactNode }) {
  // P1: the shared launcher clearance lives here, in the one place that owns
  // every player page. The shell's inner div never renders for its loading,
  // error and no-captain states, while the KO launcher (mounted below, outside
  // the shell) floats over those screens too — so the shell alone cannot own
  // it. Workout/onboarding never mount the launcher (KoAccountLink returns
  // null there), so they get no clearance, mirroring its gate exactly.
  const path = (await headers()).get('x-kochivo-path') ?? '';
  const shell = <PlayerShell unassignedAction={<SignOutButton className="min-h-12 w-full" />}><DemoMode failOpen>{children}<ProductTour role="player" /></DemoMode></PlayerShell>;
  const page = /^\/player\/(?:workout|onboarding)(?:\/|$)/.test(path) ? shell : <div className="player-content">{shell}</div>;
  return <TimezoneBoundary><div className="bg-glow min-h-dvh"><PageContainer>{page}</PageContainer><KoAccountLink player /></div></TimezoneBoundary>;
}
