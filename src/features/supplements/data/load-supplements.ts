import { fetchCaptainSupplements } from './captain';

export async function loadSupplements(playerId: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const data = await fetchCaptainSupplements(playerId);
  signal.throwIfAborted();
  return { ...data, now: Date.now() };
}
