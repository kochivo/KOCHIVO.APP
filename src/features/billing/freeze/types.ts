export type FreezeState = { captainId: string; remaining: number; pendingId: string | null; frozenUntil: string | null };
export type FreezeRequest = { id: string; player_id: string; name: string; days: number; note: string | null; created_at: string };
