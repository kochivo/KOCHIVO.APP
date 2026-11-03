import type { ReactNode } from 'react';
import { PlayerShell } from '@/features/player-shell';

export default function PlayerLayout({ children }: { children: ReactNode }) {
  return <PlayerShell>{children}</PlayerShell>;
}
