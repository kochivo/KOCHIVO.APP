import type { ReactNode } from 'react';
import { PlayerShell } from '@/features/player-shell';
import { ProductTour } from '@/features/product-tour';

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return <PlayerShell>{children}<ProductTour role="player" /></PlayerShell>;
}
