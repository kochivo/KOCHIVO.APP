import type { ReactNode } from 'react';
import { PageContainer } from '@/ui';
import { PlayerShell } from '@/features/player-shell';
import { ProductTour } from '@/features/product-tour';

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return <div className="bg-glow min-h-dvh"><PageContainer><PlayerShell>{children}<ProductTour role="player" /></PlayerShell></PageContainer></div>;
}
