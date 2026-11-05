'use client';
import type { ReactNode } from 'react';
import { LocalUserBoundary } from './local-user-boundary';
import { PlayerShell as Shell } from './player-shell';

export function PlayerShell({ children }: { children: ReactNode }) {
  return <LocalUserBoundary><Shell>{children}</Shell></LocalUserBoundary>;
}
