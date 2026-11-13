export async function runProfileWrite(lock: { current: boolean }, pending: (value: boolean) => void, operation: () => Promise<void>) {
  if (lock.current) return false;
  lock.current = true;
  pending(true);
  try { await operation(); return true; }
  finally { lock.current = false; pending(false); }
}
