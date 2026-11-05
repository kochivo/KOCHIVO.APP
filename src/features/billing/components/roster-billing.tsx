'use client';
import { ActivatePlayerButton } from './activate-player-button';
import { BalanceBadges } from './balance-badges';

export function RosterBilling(props: { playerId: string; name: string; today: string;
  pending?: boolean; frozenAt?: string | null; sessionsLeft?: number | null }) {
  return <><BalanceBadges {...props} />{props.pending && <ActivatePlayerButton {...props} />}</>;
}
