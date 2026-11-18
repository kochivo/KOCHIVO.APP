type Payment = { player_id: string; period_start: string; period_end: string };

export function archivedTierCounts(payments: Payment[], today: string) {
  const current = new Set<string>();
  const past = new Set<string>();
  for (const payment of payments) {
    if (payment.period_end < today) past.add(payment.player_id);
    else if (payment.period_start <= today) current.add(payment.player_id);
  }
  for (const player of current) past.delete(player);
  return { current: current.size, past: past.size };
}
