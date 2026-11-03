const BASE_MS = 2_000;
const MAX_MS = 5 * 60_000;

/** Exponential backoff for a failed outbox entry: 2s, 4s, 8s … capped at 5 minutes. */
export function backoffDelay(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(MAX_MS, BASE_MS * 2 ** (attempts - 1));
}
