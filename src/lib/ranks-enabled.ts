// Ranks, points and the crown stay hidden until the owner turns them on (decision 2026-11-10).
// Points keep accruing in the database meanwhile; only the player and captain surfaces are gated.
export function ranksEnabled(flag: string | undefined = process.env.NEXT_PUBLIC_RANKS_ENABLED): boolean {
  return flag === '1';
}
