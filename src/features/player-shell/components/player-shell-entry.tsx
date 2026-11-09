'use client';
import type { ReactNode } from 'react';
import { LocalUserBoundary } from './local-user-boundary';
import { PlayerShell as Shell } from './player-shell';

export function PlayerShell({ children, unassignedAction }: { children: ReactNode; unassignedAction?: ReactNode }) {
  return <LocalUserBoundary><Shell unassignedAction={unassignedAction}>{children}</Shell></LocalUserBoundary>;
}
