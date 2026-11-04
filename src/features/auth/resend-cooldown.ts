export function resendRemaining(sentAt: number, now: () => number): number {
  return Math.max(0, Math.ceil((sentAt + 60_000 - now()) / 1000));
}
