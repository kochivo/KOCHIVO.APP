import { fetchCoachReadiness } from './coach-readiness';

export async function loadReadiness(playerId: string, today: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const data = await fetchCoachReadiness(playerId, today);
  signal.throwIfAborted();
  return data;
}
