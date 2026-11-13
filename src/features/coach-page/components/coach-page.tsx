import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import { LegacyCoachPage } from './legacy-coach-page';

export async function CoachPage(props: { slug: string; requested?: CoachRequestStatus }) {
  // The literal guard lets flag-off builds remove the new client islands entirely.
  if (process.env.NEXT_PUBLIC_CAPTAIN_WORKSPACE !== '1' || !captainWorkspaceEnabled()) return LegacyCoachPage(props);
  const { PublicCoachPage } = await import('./public-coach-page');
  return <div className="pt-[var(--safe-top)]">{await PublicCoachPage(props)}</div>;
}
