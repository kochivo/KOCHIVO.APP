import type { ReactNode } from 'react';
import { PageContainer } from '@/ui';
import { PlayerShell } from '@/features/player-shell';
import { ProductTour } from '@/features/product-tour';
import { DemoMode } from '@/features/demo';
import { KoAccountLink } from '@/features/ko-preview/server';
import { SignOutButton } from '@/features/auth';
import { TimezoneBoundary } from '@/core/timezone/boundary';

export default async function PlayerLayout({ children }: { children: ReactNode }) {
  return <TimezoneBoundary><div className="bg-glow min-h-dvh"><PageContainer>
    <PlayerShell unassignedAction={<SignOutButton className="min-h-12 w-full" />}><DemoMode failOpen>{children}<ProductTour role="player" /></DemoMode></PlayerShell>
  </PageContainer><KoAccountLink player /></div></TimezoneBoundary>;
}
