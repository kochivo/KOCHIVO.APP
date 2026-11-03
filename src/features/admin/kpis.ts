export function paidCaptainShare(paid: number, captains: number): number {
  return captains === 0 ? 0 : paid / captains * 100;
}
